module.exports = class ViewProvider {

  constructor(db) {
    this.db = db;
  }

  list = () => {
    return this.db.table('view');
  }

  find = name => {
    return this.db('view').where('name', name.trim());
  }

  add = async data => {
    if( ! data.hasOwnProperty('name') ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    // check name sanity
    if( ! APP.util.validateView(data.name) ) throw Error("invalid view name");
    if( (await this.find(data.name)).length ) throw Error("a view with this name already exists");
    // insert view
    await this.db('view').insert({name: data.name});
    return "View added";
  }

  update = async data => {
    if( ! APP.util.validateKeys(['name', 'ttl', 'soa_rname', 'soa_retry', 'soa_expire', 'soa_refresh', 'soa_ttl'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    // check name sanity
    if( ! APP.util.validateView(data.name) ) throw Error("invalid view name");
    // exists?
    if( data.name !== data.oldName && await this.find(data.name) ) throw Error("a view with this name already exists");
    // check soa
    if( ! APP.util.validateTTL(data.soa_ttl) || ! APP.util.validateTTL(data.ttl) ) throw Error("ttl value out of range (1-86400)");
    if( ! APP.util.validateSoaValue(data.soa_expire) ) throw Error("Invalid SOA Expire value");
    if( ! APP.util.validateSoaValue(data.soa_refresh) ) throw Error("Invalid SOA Refresh value");
    if( ! APP.util.validateSoaValue(data.soa_retry) ) throw Error("Invalid SOA Retry value");
    if( ! APP.util.validateRname(data.soa_rname) ) throw Error("Invalid SOA RNAME value");
    // update db
    const oldName = data.oldName;
    const updateDataKeys = ['name', 'soa_ttl', 'soa_expire', 'soa_refresh', 'soa_retry', 'soa_rname', 'ttl', 'config'];
    Object.keys(data).forEach((key) => updateDataKeys.includes(key) || delete data[key]);
    await this.db('view').where('name', oldName).update(data);
    await this.db('zone').where('view', oldName).update('view', data.name);
    // Update servers
    const rs = await this.db('zone').where('view', data.name);
    const ids = [...new Set(rs.map(row => row.ns_group))];
    for( let id of ids ) await APP.api.nsGroupProvider.queueConfigSync(id);
    return "View information updated"
  }

  delete = async data => {
    if( data.name === 'default' ) throw Error('Cant delete default view');
    const zones = await this.db('zone').where('view', data.name);
    const ids = [...new Set(zones.map(row => row.ns_group))];
    for( let id of ids ) await APP.api.nsGroupProvider.queueConfigSync(id);
    await this.db.raw('DELETE FROM record WHERE zone_id IN (SELECT ID FROM zone WHERE view = ?)', [data.name]);
    await this.db('zone').where('view', data.name).del();
    await this.db('view').where('name', data.name).del();
    return "View was deleted";
  }

}
