const _ = require('lodash');
const ip = require('ip');
const ManagedServer = require('./ManagedServer');
const BindZoneFile = require('./BindZoneFile');
const BindParser = require('./BindParser');

module.exports = class ZoneProvider {

  constructor(db) {
    this.db = db;
  }

  list = async () => {
    const zones = await this.db('zone')
      .leftJoin('ns_group', 'zone.ns_group', 'ns_group.ID')
      .leftJoin('ns_group_member', function() {
        this.on('ns_group_member.group_id', 'ns_group.ID')
            .on('ns_group_member.primary', 1);
      })
      .leftJoin('server', 'server.ID', 'ns_group_member.server_id')
      .leftJoin('forwarder', 'zone.forwarder_group', 'forwarder.ID')
      .select('zone.*', 'ns_group.name as ns_group_name', 'server.name as master', 'forwarder.name AS forwarder_group_name')
      .orderBy('zone.fqdn', 'asc');
    return zones.map( zone => ({ ...zone, network: zone.fqdn.includes('.in-addr.arpa') ? APP.util.convertFqdnToIP4net(zone.fqdn) : null }) );
  }

  get = async zoneID => {
    const zone = await this.db('zone')
                  .where('zone.ID', parseInt(zoneID))
                  .leftJoin('forwarder', 'forwarder.ID', 'zone.forwarder_group')
                  .select('zone.*', 'forwarder.members AS forwarders', 'forwarder.name AS forwarders_name')
                  .first();
    const server = await this.db.raw('SELECT managed FROM server WHERE ID = (SELECT server_id FROM ns_group_member WHERE `group_id` = ? AND `primary` = 1)', [zone.ns_group]);
    const acls = await this.db('acl_usage').where({user_id: zone.ID, type: 'dynamic_update'});
    zone.managed = server[0].managed;
    zone.dynamicUpdates = Boolean(acls.length);
    zone.dynamicUpdatesAcls = acls.map(acl => acl.acl_id);
    return zone;
  }

  getAcls = zoneID => {
    return this.db('acl_usage').where({type: 'dynamic_update', user_id: zoneID})
  }

  preview = async zoneID => {
    // ToDo :: silly hack/workaround. reorganize stuff.
    const zone = await this.db('zone').where('ID', parseInt(zoneID)).first();
    const serverData = await this.db('server').join('ns_group_member', 'ns_group_member.server_id', 'server.ID').where({'ns_group_member.primary':1, 'ns_group_member.group_id': zone.ns_group}).first();
    const server = new ManagedServer(this.db);
    server.setFromObject(serverData);
    await server.loadDnsDetails();
    const zones = await server.getServerZones(zone.ID);
    const records = await this.listRecords(zone.ID, false);
    const zoneFile = new BindZoneFile(zones[0], records);
    return {zoneFile: zoneFile.buildZoneFile()};
  }

  add = async data => {
    console.log(data);
    if( ! APP.util.validateKeys(['fqdn', 'ns_group', 'view', 'comment'], data) ) throw Error("missing key in input data object");
    // convert network to fqdn
    if( APP.util.validateIP4ReverseNetwork(data.fqdn) ) data.fqdn = APP.util.convertIP4netToFQDN(data.fqdn);
    // check FQDN sanity
    if( ! APP.util.validateFQDN(data.fqdn) ) throw Error("invalid fqdn");
    // check comment sanity
    if( ! APP.util.validateZoneComment(data.comment) ) throw Error("comment must have < 250 characters");
    // validate zone type
    if( ! ['authoritative', 'forward', 'stub'].includes(data.type) ) throw Error("invalid zone type");
    // validate nsgroup
    const myNsGroup = await this.db('ns_group').where('ID', data.ns_group);
    if( ! myNsGroup.length ) throw Error("invalid ns group identifier");
    // validate fwdgroup
    if( data.type === 'forward' ) {
      const myFwdGroup = await this.db('forwarder').where('ID', data.fwd_group);
      if( ! myFwdGroup.length ) throw Error("invalid forwarder group identifier");
    }
    // zone already exists?
    const rs = await this.db('zone').where({fqdn: data.fqdn, view: data.view});
    if( rs.length > 0 ) throw Error("zone already exists in this view");
    // insert zone
    await this.db('zone').insert({fqdn: data.fqdn, ns_group: data.ns_group, forwarder_group: data.type === 'forward' ? data.fwd_group : null, view: data.view, type: data.type, comment: data.comment});
    await APP.api.nsGroupProvider.queueConfigSync(data.ns_group);
    return "Zone added";
  }

  import = async data => {
    function getGroupIdByName(name, groups) {
      const match = groups.find(group => group.name === name);
      return Boolean(match) ? match.ID : null;
    }
    let zone, subnet, zoneString, i,
    errorCount = 0,
    insertChunkSize = 50,
    insertChunk = [],
    imported = 0;
    const zoneDeleteIDs = [];
    if( ! APP.util.validateKeys(['zones', 'options'], data) ) throw Error("missing key in input data object");
    console.log("Importing " + data.zones.length + " zones ...");
    console.log("Import options:", data.options);
    // Get groups and views
    const fwdgroups = await this.db('forwarder').select('*');
    const nsgroups = await this.db('ns_group').select('*');
    const views = await this.db('view').select('*');
    // All ns group ID and
    for( const zone of data.zones ) {
      if( APP.util.validateIP4ReverseNetwork(zone.fqdn) ) zone.fqdn = APP.util.convertIP4netToFQDN(zone.fqdn);
      zone.existingZone = await this.db('zone').where({fqdn: zone.fqdn, view: zone.view}).first();;
      zone.nsgroup_id = getGroupIdByName(zone.nsgroup, nsgroups);
      zone.fwdgroup_id = getGroupIdByName(zone.fwdgroup, fwdgroups);
      zone.view_exists = Boolean(views.find(view => view.name === zone.view));
    }
    // Import zones to database
    for( const zone of data.zones ) {
      try {
        if( ! APP.util.validateFQDN(zone.fqdn) ) throw Error('Invalid FQDN for zone ' + zone.fqdn);
        if( ! APP.util.validateZoneComment(zone.comment) ) throw Error("comment must have < 250 characters");
        if( zone.existingZone && ! data.options.replaceZones ) throw Error('Zone ' + zone.fqdn + ' already exists in view ' + zone.view);
        if( zone.nsgroup_id === null ) throw Error('Nameserver Group ' + zone.nsgroup + ' does not exist');
        if( zone.type === 'forward' && zone.fwdgroup_id === null ) throw Error('Forwarder Group ' + zone.fwdgroup + ' does not exist');
        if( ! zone.view_exists ) throw Error('View ' + zone.view + ' does not exist');
        console.log('Zone ' + zone.fqdn + ' will be imported...');
        // Insert in chunks
        if( insertChunk.length >= insertChunkSize ) {
          await this.db('zone').insert(insertChunk);
          insertChunk = [];
        }
        insertChunk.push({
          fqdn: zone.fqdn,
          view: zone.view,
          type: zone.type,
          comment: zone.comment,
          ns_group: zone.nsgroup_id,
          forwarder_group: zone.fwdgroup_id
        });
        imported++;
        if( zone.existingZone && data.options.replaceZones ) zoneDeleteIDs.push(zone.existingZone.ID);
      } catch (e) {
        errorCount++;
        console.log(e);
        if( ! data.options.skipError ) throw Error(e);
      }
    }
    if( insertChunk.length > 0 ) await this.db('zone').insert(insertChunk);
    // delete existing
    if( zoneDeleteIDs.length > 0 ) await this.delete(zoneDeleteIDs);
    // update configs
    for( let nid of data.zones.map(zone => zone.nsgroup_id) ) await APP.api.nsGroupProvider.queueConfigSync(nid);
    return `${imported} of ${data.zones.length} zones imported. ${errorCount} errors.`;
  }

  touch = async input => {
    const idArray  = Array.isArray(input) ? input : [input];
    const zones    = await this.db('zone').whereIn('ID', idArray);
    const nsGroups = [...new Set(zones.map(zone => zone.ns_group))];
    for( let nsGroup of nsGroups ) await APP.api.nsGroupProvider.queueConfigSync(nsGroup, true); // sync primary only
    await this.db('zone').increment('soa_serial').whereIn('ID', idArray);
    return true;
  }

  update = async data => {
    const updateKeys = ['ns_group', 'forwarder_group', 'comment', 'ttl', 'soa_rname', 'soa_retry', 'soa_expire', 'soa_refresh', 'soa_ttl', 'soa_serial', 'config'];
    if( ! APP.util.validateKeys(['ID', 'dynamicUpdatesAcls', ...updateKeys], data) ) throw Error("missing key in input data object");
    // check zone existence and get current data
    const zoneInfo = await this.db('zone').where('ID', data.ID).first();
    if( ! zoneInfo )  throw Error("Invalid zone identifier");
    // check comment sanity
    if( ! APP.util.validateZoneComment(data.comment) ) throw Error("comment must have < 250 characters");
    // validate nsgroup
    const nsGroup = await this.db('ns_group').where('ID', data.ns_group);
    if( ! nsGroup.length ) throw Error("invalid ns group identifier");
    // validate fwdgroup
    if( zoneInfo.type === 'forward' ) {
      const fwdGroup = await this.db('forwarder').where('ID', data.forwarder_group);
      if( ! fwdGroup.length ) throw Error("invalid fwd group identifier");
    }
    // validate SOA
    if( data.soa_rname !== null ) {
      if( ! APP.util.validateTTL(data.soa_ttl) ) throw Error("ttl value out of range (1-86400)");
      if( ! APP.util.validateSoaValue(data.soa_expire) ) throw Error("Invalid SOA Expire value");
      if( ! APP.util.validateSoaValue(data.soa_refresh) ) throw Error("Invalid SOA Refresh value");
      if( ! APP.util.validateSoaValue(data.soa_retry) ) throw Error("Invalid SOA Retry value");
      if( ! APP.util.validateRname(data.soa_rname) ) throw Error("Invalid SOA RNAME value");
    }
    // validate default ttl
    if( data.ttl !== null && ! APP.util.validateTTL(data.ttl) ) throw Error("ttl value out of range (1-86400)");
    // validate access lists
    if( data.dynamicUpdatesAcls.length ) {
      const rs = await this.db('acl').whereIn('ID', data.dynamicUpdatesAcls);
      if( data.dynamicUpdatesAcls.length !== rs.length ) throw Error("error validating selected access lists");
    }
    // frozen?
    const acls = await this.getAcls(data.ID);
    if( ! Boolean(data.frozen) && acls.length > 0 ) throw Error('This zone currently allows dynamic updates. Freeze the zone first in order to make changes.');
    // update acls
    await this.db('acl_usage').where({type: 'dynamic_update', user_id: data.ID}).del();
    for( let i = 0; i < data.dynamicUpdatesAcls.length; i++ ){
      await this.db('acl_usage').insert({type: 'dynamic_update', user_id: data.ID, acl_id: data.dynamicUpdatesAcls[i]});
    }
    // update zone
    const updateData = updateKeys.reduce((obj, key) => ({ ...obj, [key]: data[key] }), {});
    await this.db('zone').where('ID', data.ID).update(updateData);
    await APP.api.nsGroupProvider.queueConfigSync(data.ns_group);
    return "Zone information updated";
  }

  freeze = async data => {
    const servers = await APP.api.nsGroupProvider.matrix();
    const serverID = servers.find(server => (server.group_id === data.ns_group && Boolean(server.primary))).server_id;
    const server = new ManagedServer(this.db);
    await server.setFromId(serverID);
    const success1 = await server.freezeZone(data.fqdn, data.view);
    if( success1 ) await this.db('zone').where('ID', data.ID).update('frozen', 1);
    const success2 = success1 && await this.sync(data);
    return "Zone is now frozen";
  }

  thaw = async data => {
    const servers = await APP.api.nsGroupProvider.matrix();
    const serverID = servers.find(server => (server.group_id === data.ns_group && Boolean(server.primary))).server_id;
    const server = new ManagedServer(this.db);
    await server.setFromId(serverID);
    const success = await server.thawZone(data.fqdn, data.view);
    if( success ) await this.db('zone').where('ID', data.ID).update('frozen', 0);
    return "Zone thawed";
  }

  sync = async data => {
    const servers = await APP.api.nsGroupProvider.matrix();
    const serverID = servers.find(server => (server.group_id === data.ns_group && Boolean(server.primary))).server_id;
    const server = new ManagedServer(this.db);
    await server.setFromId(serverID);
    const success = await server.syncZone(data.fqdn, data.view);
    if( success ) {
      const remoteFile  = `${server.getConfigPath()}/${data.fqdn}.${data.view}.db`;
      const sshCon = await server.createConnection();
      const fileContent = await server.getRemoteFileContents(sshCon, remoteFile);
      const parser = new BindParser();
      parser.setContent(fileContent);
      const records = parser.getRecords()
        .map(record => ({type: record.type.toLowerCase(), name: record.name, data: record.data, ttl: null, zone_id: data.ID}))
        .filter(record => record.type !== 'ns');
      await this.db('zone').update('soa_serial', parser.getSerial()).where('ID', data.ID);
      await this.db('record').where('zone_id', data.ID).del();
      const chunks = _.chunk(records, 199);
      for( const chunk of chunks ) await this.db('record').insert(chunk);
    }
    return "Zone was re-imported";
  }

  delete = async data => {
    const zones = await this.db('zone').whereIn('ID', data);
    const nsGroups = [...new Set(zones.map(zone => zone.ns_group))];
    for( let id of nsGroups ) await APP.api.nsGroupProvider.queueConfigSync(id);
    await this.db('zone').whereIn('ID', data).del();
    await this.db('record').whereIn('zone_id', data).del();
    await this.db('acl_usage').whereIn('user_id', data).del();
    return "DNS zones deleted";
  }

  findReverseZone = async ipaddr => {
    let subnet, reverseZone, reverseZoneFQDN, ptrName;
    for( let bits = 24; bits >= 8; bits -= 8 ) {
      subnet = ip.cidrSubnet(ipaddr + "/" + String(bits));
      reverseZoneFQDN = APP.util.convertIP4netToFQDN(subnet.networkAddress + "/" + String(bits));
      reverseZone = await this.db('zone').where('fqdn', reverseZoneFQDN).first();
      if( reverseZone ) {
        const parts = ip.toBuffer(ipaddr);
        switch(bits) {
          case 8: ptrName = `${parts[3]}.${parts[2]}.${parts[1]}`;
            break;
          case 16: ptrName = `${parts[3]}.${parts[2]}`;
            break;
          case 24: ptrName = parts[3];
            break;
        }
        return {zone: reverseZone, ptrName: ptrName};
      }
    }
    return false;
  }

  listRecords = async (zoneID, addNS = true) => {
    const records = await this.db('record').where('zone_id', zoneID).orderBy('name', 'asc');
    if( addNS ) {
      const ns = await this.db('zone').where('zone.ID', zoneID)
        .join('ns_group_member', 'ns_group_member.group_id', 'zone.ns_group')
        .join('server', 'server.ID', 'ns_group_member.server_id')
        .select('server.dns_fqdn')
      for( let i = 0; i < ns.length; i++ ) {
        records.unshift({zone_id: zoneID, name: '@', type: 'ns', data: ns[i].dns_fqdn, ttl: null, protected: true});
      }
    }
    return records;
  }

  addRecord = async data => {
    if( ! APP.util.validateKeys(['name', 'zone_id', 'type', 'data', 'ttl'], data) ) throw Error("missing key in input data object");
    // validate record name and type
    if( data.type !== 'custom' && ! APP.util.validateDnsName(data.name) ) throw Error("invalid record name");
    if( ! APP.util.validateRecordType(data.type) ) throw Error("invalid record type");
    // zone exists?
    const rs = await this.db('zone').where('ID', parseInt(data.zone_id)).first();
    if( ! rs ) throw Error("invalid zone identifier");
    // dynamic zones must be frozen
    const acls = await this.getAcls(data.zone_id);
    if( ! Boolean(rs.frozen) && acls.length > 0 ) throw Error('This zone currently allows dynamic updates. Freeze the zone first in order to make changes.');
    // Type-based checks
    APP.util.validateRecordSanity(data.type, data.name, data.data);
    // For A-Records: try to find reverse zone and add ptr record
    if( data.addPTR && data.type === 'a' ) {
      const reverseZone = await this.findReverseZone(data.data);
      if( reverseZone === false ) throw Error("No reverse zone exists for this IP address");
      await this.db('record').insert({type: 'ptr', name: reverseZone.ptrName, data:data.name + '.' + rs.fqdn + '.', zone_id: reverseZone.zone.ID, ttl: data.ttl});
      await this.touch(reverseZone.zone.ID);
    }
    // insert record
    await this.db('record').insert({type: data.type, name: data.name, data: data.data, zone_id: data.zone_id, ttl: data.ttl});
    await this.touch(data.zone_id);
    return "DNS Record added";
  }

  importRecords = async data => {
    let i, rs, zone, zones, record,
    errorCount = 0,
    insertChunkSize = 100,
    insertChunk = [],
    imported = 0;
    if( ! APP.util.validateKeys(['records', 'options'], data) ) throw Error("missing key in input data object");
    console.log("Importing " + data.records.length + " DNS records ...");
    console.log("Import options:", data.options);
    // Get all zones (unique) and check existence and dyn.state
    const acls = await this.db('acl_usage').select('*');
    zones = [...new Set(data.records.map(row => row.zone))].map(zone => ({fqdn: zone}));
    for( i = 0; i < zones.length; i++ ) {
      rs = await this.db('zone').select('ID').where('fqdn', zones[i].fqdn).first();
      zones[i].id = Boolean(rs) ? rs.ID : null;
      if( zones[i].id !== null ) {
        zones[i].dynamicUpdates = Boolean(acls.find(acl => acl.user_id === rs.ID && acl.type === 'dynamic_update'));
        zones[i].frozen = rs.frozen;
      }
    }
    // Import records to database
    for( i = 0; i < data.records.length; i++ ) {
      record = data.records[i];
      record.name = record.name.toLowerCase(); // Force lower case on dns names to avoid import errors
      record.type = record.type.toLowerCase();
      if( data.options.ignoreNS && record.type === 'ns' ) continue;
      if( data.options.ignoreTTL ) record.ttl = null;
      try {
        zone = zones.find(zone => zone.fqdn === record.zone);
        if( zone.id === null ) throw Error('Zone ' + record.zone + ' does not exist' );
        if( zone.dynamicUpdates && ! zone.frozen ) throw Error('Zone ' + record.zone + ' isn`t frozen');
        if( ! APP.util.validateRecordType(record.type) ) throw Error("Invalid record type: " + record.type);
        if( ! APP.util.validateDnsName(record.name) ) throw Error("Invalid record name: " + record.name);
        // Insert in chunks of 100
        if( insertChunk.length >= insertChunkSize ) {
          await this.db('record').insert(insertChunk);
          insertChunk = [];
        }
        insertChunk.push({zone_id: zone.id, name: record.name, type: record.type, data: record.data, ttl: record.ttl});
        imported++;
      } catch (e) {
        errorCount++;
        console.log(e);
        if( ! data.options.skipError ) throw Error(e);
      }
    }
    if( insertChunk.length > 0 ) await this.db('record').insert(insertChunk);
    // update serials
    await this.touch(zones.map(zone => zone.id));
    return `${imported} of ${data.records.length} records imported. ${errorCount} errors.`;
  }

  updateRecord = async data => {
    if( ! APP.util.validateTTL(data.ttl) && data.ttl !== null ) throw Error("ttl value out of range (1-86400)");
    APP.util.validateRecordSanity(data.type, data.name, data.data); // throws error itself if necessary
    // Get zone data
    const rs = await this.db('zone').where('ID', parseInt(data.zone_id)).first();
    if( ! rs ) throw Error("invalid zone identifier");
    // Update PTR record
    if( data.addPTR && data.type === 'a' ) {
      const reverseZone = await this.findReverseZone(data.data);
      if( reverseZone === false ) throw Error("No reverse zone exists for this IP address");
      const ptrData = data.name + '.' + rs.fqdn + '.';
      // Clear old PTRs
      await this.db('record').where({type: 'ptr', data: ptrData}).delete(); // ToDo: beware: zone might not be updated (touched)
      await this.db('record').where({type: 'ptr', zone_id: reverseZone.zone.ID, name: reverseZone.ptrName}).delete();
      // Add new PTR
      await this.db('record').insert({type: 'ptr', name: reverseZone.ptrName, data: ptrData, zone_id: reverseZone.zone.ID, ttl: data.ttl});
      await this.touch(reverseZone.zone.ID);
    }
    // update record
    await this.db('record').where('ID', data.ID).update({ttl: data.ttl, data: data.data, name: data.name});
    // update serials
    await this.touch(data.zone_id);
    return "DNS Record updated";
  }

  updateRecords = async data => {
    if( ! APP.util.validateTTL(data.ttl) && data.ttl !== null ) throw Error("ttl value out of range (1-86400)");
    // update records
    await this.db('record').whereIn('ID', data.id_list).update({ttl: data.ttl});
    // update serials
    const records = await this.db('record').whereIn('ID', data.id_list);
    const zoneIDs = [...new Set(records.map(record => record.zone_id))];
    await this.touch(zoneIDs);
    return "DNS Records updated";
  }

  deleteRecords = async data => {
    const zone = await this.db('record').where('record.ID', data[0]).join('zone', 'zone.ID', 'record.zone_id').select('zone.ns_group', 'zone.ID', 'zone.frozen').first();
    // exists?
    if( ! zone ) throw Error("Record doesnt exist or is a system record");
    // frozen?
    const acls = await this.getAcls(zone.ID);
    if( ! Boolean(zone.frozen) && acls.length > 0 ) throw Error('This zone currently allows dynamic updates. Freeze the zone first in order to make changes.');
    // exec deletion
    let chunks = _.chunk(data, 999);
    for( let i = 0; i < chunks.length; i++ ) await this.db('record').whereIn('ID', chunks[i]).del();
    await this.touch(zone.ID);
    return "Records were deleted"
  }

}
