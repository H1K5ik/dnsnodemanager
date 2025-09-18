const ConfigSaver = require('./ConfigSaver');

module.exports = class NsGroupProvider {

  constructor(db) {
    this.db = db;
    this.configSaver = new ConfigSaver(db);
  }

  list = () => {
    return this.db.table('ns_group')
      .leftJoin('ns_group_member', 'ns_group_member.group_id', 'ns_group.ID')
      .select('ns_group.*')
      .count('ns_group_member.server_id as members')
      .groupBy('ns_group.ID');
  }

  tree = async () => {
    const groups = await db.table('ns_group');
    const members = await db.table('ns_group_member')
      .leftJoin('server', 'ns_group_member.server_id', 'server.ID')
      .select('ns_group_member.*', 'server.name', 'server.managed', 'server.dns_ip');
    return groups.map(group => {
      group.members = members.filter( member => { return member.group_id === group.ID; });
      return group;
    });
  }

  matrix = () => {
    return this.db('ns_group')
      .join('ns_group_member', 'ns_group_member.group_id', 'ns_group.ID')
      .join('server', 'server.ID', 'ns_group_member.server_id')
      .select('ns_group_member.group_id', 'ns_group_member.server_id', 'server.dns_ip', 'server.dns_fqdn', 'ns_group_member.primary', 'ns_group_member.hidden');
  }

  get = id => {
    return this.db('ns_group').where('ID', id);
  }

  getMembers = id => {
    return this.db('ns_group_member')
      .join('server', 'ns_group_member.server_id', 'server.ID')
      .leftJoin('server as source', 'ns_group_member.source_id', 'source.ID')
      .select('ns_group_member.*', 'server.name', 'server.managed', 'server.dns_ip', 'source.name as source_name')
      .where('ns_group_member.group_id', id);
  }

  add = async data => {
    if( ! data.hasOwnProperty('name') ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    // validation
    if( ! APP.util.validateNsGroupName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
    const rs = await this.db('ns_group').where('name', data.name);
    if( rs.length > 0 ) throw Error("group name already exists");
    // insert
    const insertResult = await this.db('ns_group').insert({ name: data.name });
    const groupId = insertResult[0];
    
    const groupData = { ID: groupId, name: data.name };
    await this.configSaver.saveNsGroupConfig(groupData, [], { username: data.username || 'system' });
    
    return "Nameserver group added";
  }

  update = async data => {
    if( ! APP.util.validateKeys(['name', 'ID'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    // validation
    if( ! APP.util.validateNsGroupName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
    const rs = await this.db('ns_group').where('name', data.name).whereNot('ID', data.ID);
    if( rs.length ) throw Error("Another group with this name already exists");
    // update table
    await this.db('ns_group').where({ID: data.ID}).update({name: data.name});
    
    const updatedGroup = await this.db('ns_group').where('ID', data.ID).first();
    const members = await this.getMembers(data.ID);
    await this.configSaver.saveNsGroupConfig(updatedGroup, members, { username: data.username || 'system' });
    
    return "Nameserver group updated";
  }

  delete = async data => {
    if( ! data.hasOwnProperty('ID') ) throw Error("missing key in input data object");
    const gid = parseInt(data.ID);
    if( ! gid ) throw Error("invalid id input");
    await this.db('ns_group_member').where('group_id', gid).del();
    await this.db('ns_group').where('ID', gid).del();
    return "Nameserver group deleted";
  }

  addMember = async data => {
    let rs;
    if( ! APP.util.validateKeys(['server_id', 'group_id'], data) ) throw Error("missing key in input data object");
    // server and group exist?
    rs = await this.db('server').where('ID', data.server_id);
    if( ! rs.length ) throw Error("server id does not exist");
    rs = await this.db('ns_group').where('ID', data.group_id);
    if( ! rs.length ) throw Error("group id does not exist");
    // already member?
    rs = await this.db('ns_group_member').where('server_id', data.server_id).andWhere('group_id', data.group_id);
    if( rs.length ) throw Error("server is already member of group");
    
    // Check if this is the first server in the group
    const existingMembers = await this.db('ns_group_member').where('group_id', data.group_id);
    const isFirstServer = existingMembers.length === 0;
    
    // insert member with primary flag if it's the first server
    await this.db('ns_group_member').insert({ 
      server_id: data.server_id, 
      group_id: data.group_id,
      primary: isFirstServer 
    });
    
    const groupData = await this.db('ns_group').where('ID', data.group_id).first();
    const members = await this.getMembers(data.group_id);
    const serverData = await this.db('server').where('ID', data.server_id).first();
    
    // Переносим существующие конфигурации сервера в структуру группы
    await this.configSaver.moveServerToGroup(serverData.name, groupData.name, { username: data.username || 'system' });
    
    // Получаем зоны группы и сохраняем их для нового сервера
    const zones = await this.db('zone').where('ns_group', data.group_id);
    
    for (const zone of zones) {
      const records = zone.type === 'authoritative' ? 
        await this.db('record').where('zone_id', zone.ID).orderBy('name', 'asc') : [];
      await this.configSaver.saveGroupServerZone(groupData, serverData, zone, records, { username: data.username || 'system' });
    }
    
    await this.queueConfigSync(data.group_id);
    await this.touchZones(data.group_id);
    return "Server added to group";
  }

  updateMember = async data => {
    let rs, source_id;
    if( ! APP.util.validateKeys(['server_id', 'group_id', 'hidden', 'source_id'], data) ) throw Error("missing key in input data object");
    // Member exists?
    rs = await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id});
    if( ! rs.length ) throw Error("invalid group member identifier");
    // we dont want all to be hidden. so check all...
    //     later!
    // resolve source_id if needed
    source_id = null;
    if( parseInt(data.source_id) > 0 ) {
        rs = await this.db('server').where('ID', data.source_id);
        source_id = rs.length > 0 ? data.source_id : null;
    }
    // update database
    await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id}).update({hidden: data.hidden, source_id: source_id});
    await this.queueConfigSync(data.group_id);
    await this.touchZones(data.group_id);
    return "Changes saved"
  }

  deleteMember = async data => {
    if( ! APP.util.validateKeys(['server_id', 'group_id'], data) ) throw Error("missing key in input data object");
    // can't delete primary unless it's the last server in the group
    // build this some time
    await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id}).del();
    await this.queueConfigSync(data.group_id, true);
    await this.touchZones(data.group_id);
    return true;
  }

  setPrimary = async data => {
    if( ! APP.util.validateKeys(['server_id', 'group_id'], data) ) throw Error("missing key in input data object");
    // member exists?
    const rs = await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id});
    if( ! rs.length ) throw Error("invalid group member identifier");
    
    // Check if there are any existing primary servers
    const existingPrimary = await this.db('ns_group_member')
      .where('group_id', data.group_id)
      .where('primary', 1)
      .first();
    
    // update database - first reset all to false, then set the new one to true
    await this.db('ns_group_member').where({group_id: data.group_id}).update({primary: false});
    await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id}).update({primary: true});
    
    const groupData = await this.db('ns_group').where('ID', data.group_id).first();
    const members = await this.getMembers(data.group_id);
    await this.configSaver.saveNsGroupConfig(groupData, members, { username: data.username || 'system' });
    
    await this.queueConfigSync(data.group_id);
    return "Primary role changed";
  }

  queueConfigSync = async (groupID, primaryOnly) => {
    if( primaryOnly ) {
      return this.db('server')
        .where('managed', 1)
        .whereIn('ID', 
          this.db('ns_group_member')
            .select('server_id')
            .where('primary', 1)
            .where('group_id', groupID)
        )
        .update('update_required', 1);
    } else {
      return this.db('server')
        .where('managed', 1)
        .whereIn('ID', 
          this.db('ns_group_member')
            .select('server_id')
            .where('group_id', groupID)
        )
        .update('update_required', 1);
    }
  }

  touchZones = groupID => {
    return this.db('zone').increment('soa_serial').where('ns_group', groupID);
  }
  // херня by ии, можно потом удалить
  // Auto-fix groups without primary servers
  autoFixPrimaryServers = async () => {
    try {
      // Find all groups
      const groups = await this.db('ns_group').select('*');
      
      for (const group of groups) {
        // Check if group has any primary server
        const primaryServer = await this.db('ns_group_member')
          .where('group_id', group.ID)
          .where('primary', 1)
          .first();
        
        if (!primaryServer) {
          // Find first available server in the group
          const firstServer = await this.db('ns_group_member')
            .where('group_id', group.ID)
            .first();
          
          if (firstServer) {
            // Set the first server as primary
            await this.db('ns_group_member')
              .where('server_id', firstServer.server_id)
              .where('group_id', group.ID)
              .update({primary: true});
            
            console.log(`Auto-fixed: Server ${firstServer.server_id} set as primary for group ${group.ID}`);
          }
        }
      }
      
      return "Primary servers auto-fixed";
    } catch (error) {
      console.error('Error in autoFixPrimaryServers:', error);
      throw error;
    }
  }

}
