const ConfigSaver = require('./ConfigSaver');

module.exports = class AclProvider {

  constructor(db) {
    this.db = db;
    this.configSaver = new ConfigSaver(db);
  }

  list = () => {
    return this.db.table('forwarder');
  }

  add = async data => {
    if( ! APP.util.validateKeys(['name', 'members'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    if( ! APP.util.validateNsGroupName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
    if( ! APP.util.validateFwdMembers(data.members) ) throw Error("invalid ip address in members list");
    // group already exists?
    const rs = await this.db('forwarder').where('name', data.name);
    if( rs.length ) throw Error("forwarder group name already exists");
    // insert zone
    const insertResult = await this.db('forwarder').insert({ name: data.name, members: data.members });
    const groupId = insertResult[0];
    
    const groupData = { ID: groupId, name: data.name, members: data.members };
    await this.configSaver.saveFwdGroupConfig(groupData, { username: data.username || 'system' });
    
    return "Forwarder Group created"
  }

  update = async data => {
    if( ! APP.util.validateKeys(['ID', 'name', 'members'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    if( ! APP.util.validateNsGroupName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
    if( ! APP.util.validateFwdMembers(data.members) ) throw Error("invalid ip address in members list");
    // group already exists?
    const rs = await this.db('forwarder').where('name', data.name).whereNot('ID', data.ID);
    if( rs.length > 0 ) throw Error("forwarder group name already exists");
    // update group
    await this.db('forwarder').where('ID', data.ID).update({name: data.name, members: data.members});
    
    const updatedGroup = await this.db('forwarder').where('ID', data.ID).first();
    await this.configSaver.saveFwdGroupConfig(updatedGroup, { username: data.username || 'system' });
    
    // config sync
    const zones = await this.db('zone').where('forwarder_group', data.ID);
    const groupIDs = [...new Set(zones.map(zone => zone.ns_group))];
    for( let groupID of groupIDs ) await APP.api.nsGroupProvider.queueConfigSync(groupID);
    return "Forwarder Group updated";
  }

  delete = async data => {
    const gid = parseInt(data.ID);
    if( ! gid ) throw Error("invalid id input");
    // Check if this fwd group is used somewhere
    const rs = await this.db('zone').where('forwarder_group', gid);
    if( rs.length ) throw Error(`This forwarder group is still used by ${rs.length} DNS zones`);
    // Update group info
    await this.db('forwarder').where('ID', gid).del();
    return "Group deleted";
  }

}