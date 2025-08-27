module.exports = class NsGroupProvider {

  constructor(db) {
    this.db = db;
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
    await this.db('ns_group').insert({ name: data.name });
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
    // insert member
    await this.db('ns_group_member').insert({ server_id: data.server_id, group_id: data.group_id });
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
    // update database
    await this.db('ns_group_member').where({group_id: data.group_id}).update({primary: false});
    await this.db('ns_group_member').where({server_id: data.server_id, group_id: data.group_id}).update({primary: true});
    await this.queueConfigSync(data.group_id);
    return "Primary role changed";
  }

  queueConfigSync = (groupID, primaryOnly) => {
    if( primaryOnly ) {
      return this.db.raw('UPDATE server SET update_required = 1 WHERE managed = 1 AND ID IN (SELECT server_id FROM ns_group_member WHERE `primary` = 1 AND group_id = ?)', [groupID]);
    } else {
      return this.db.raw('UPDATE server SET update_required = 1 WHERE managed = 1 AND ID IN (SELECT server_id FROM ns_group_member WHERE group_id = ?)', [groupID]);
    }
  }

  touchZones = groupID => {
    return this.db('zone').increment('soa_serial').where('ns_group', groupID);
  }

}
