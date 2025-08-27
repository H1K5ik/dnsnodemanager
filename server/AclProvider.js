module.exports = class AclProvider {

  constructor(db) {
    this.db = db;
  }

  list = () => {
    return this.db.table('acl');
  }

  add = async data => {
    if( ! APP.util.validateKeys(['name', 'members'], data) ) throw Error("missing key in input data object");
    if( ! APP.util.validateNsGroupName(data.name.trim()) ) throw Error("name not within allowed length (2-100 chars)");
    if( ! APP.util.validateFwdMembers(data.members) ) throw Error("invalid ip address in members list");
    // acl already exists?
    const rs = await this.db('acl').where('name', data.name.trim());
    if( rs.length ) throw Error("acl name already exists");
    // insert acl
    await this.db('acl').insert({ name: data.name.trim(), members: data.members });
    return "ACL created";
  }

  update = async data => {
    if( ! APP.util.validateKeys(['ID', 'name', 'members'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    if( ! APP.util.validateNsGroupName(data.name) ) throw Error(" name not within allowed length (2-100 chars)");
    if( ! APP.util.validateFwdMembers(data.members) ) throw Error("invalid ip address in members list");
    // acl already exists?
    const rs = await this.db('acl').where('name', data.name).whereNot('ID', data.ID);
    if( rs.length ) throw Error("acl name already exists");
    // update group
    await this.db('acl').where('ID', data.ID).update({name: data.name, members: data.members});
    const zones = await this.db.raw('SELECT zone.ns_group FROM zone, acl_usage WHERE acl_usage.acl_id = ? AND acl_usage.type = ? AND acl_usage.user_id = zone.ID', [data.ID, 'dynamic_update']);
    for( let zone of zones ) await APP.api.nsGroupProvider.queueConfigSync(zone.ns_group);
    return "ACL updated";
  }

  delete = async data => {
    const id = parseInt(data.ID);
    if( ! id ) throw Error("invalid id input");
    // Check if this acl is used somewhere
    const rs = await this.db('acl_usage').where('acl_id', id);
    if( rs.length ) throw Error(`This ACL is still used by ${rs.length} objects`);
    // Update acl info
    await this.db('acl').where('ID', id).del();
    return "ACL deleted";
  }

}
