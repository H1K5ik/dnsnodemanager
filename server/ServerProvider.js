const ManagedServer = require('./ManagedServer');

module.exports = class ServerProvider {

  constructor(db) {
    this.db = db;
  }

  list = async (request) => {
    const query = this.db.table('server');
    
    if (request && request.user && request.user.role === 'dnsop' && request.user.ID) {
      const accessibleGroups = await this.db('user_ns_group_access')
        .where('user_id', request.user.ID)
        .select('group_id');
      const groupIds = accessibleGroups.map(g => g.group_id);
      if (groupIds.length > 0) {
        const accessibleServers = await this.db('ns_group_member')
          .whereIn('group_id', groupIds)
          .select('server_id')
          .distinct();
        const serverIds = accessibleServers.map(s => s.server_id);
        if (serverIds.length > 0) {
          query.whereIn('server.ID', serverIds);
        } else {
          query.where('server.ID', -1);
        }
      } else {
        query.where('server.ID', -1);
      }
    }
    
    return query;
  }

  testSSH = async id => {
    const serverData = await this.db('server').where('ID', id).first();
    if( ! serverData ) throw Error('server not found');
    const server = new ManagedServer(this.db);
    server.setFromObject(serverData);
    const checkResults = await server.execSshChecks();
    const updates = { last_status: checkResults.success };
    if( checkResults.success ) updates.last_connection = this.db.fn.now();
    await this.db('server').where('ID', id).update(updates);
    return {...checkResults, server: serverData.name};
  }

  forceSync = async (data, request) => {
    const server = new ManagedServer(this.db);
    await server.setFromId(parseInt(data.ID));
    const userInfo = request && request.user ? { name: request.user.name, role: request.user.role } : null;
    await server.forceConfigSync(null, userInfo);
    return "Configuration sync successful";
  }

  syncPending = async (data, request) => {
    let row, server, success = true;
    const servers = await this.db('server').where({update_required: 1, managed: 1, active: 1});
    const userInfo = request && request.user ? { name: request.user.name, role: request.user.role } : { name: 'system', role: 'system' };
    for( row of servers ) {
      server = new ManagedServer(this.db);
      server.setFromObject(row);
      success = success && await server.forceConfigSync(null, userInfo);
    }
    return success ? "Configuration Sync Successful!" : "Configuration Sync Failed. Check Logfiles.";
  }

  add = async data => {
    if( ! APP.util.validateKeys(['name', 'dns_ip', 'dns_fqdn', 'managed', 'ssh_host', 'ssh_pass', 'ssh_user', 'config_path'], data) ) throw Error("missing key in input data object");
    if( ! APP.util.validateIP(data.dns_ip) ) throw Error("invalid ip address");
    if( ! APP.util.validateFQDN(data.dns_fqdn) ) throw Error("invalid nameserver fqdn");
    data.name = data.name.trim();
    if( ! APP.util.validateServerName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
    // server already exists?
    const rs = await this.db('server').where('name', data.name).orWhere('dns_ip', data.dns_ip);
    if( rs.length > 0 ) throw Error("server name or ip already exists");
    // todo: path validation?
    data.config_path = data.config_path.replace(/\/$/, '');
    // todo: ssh cred validation?
    // add to database
    await this.db('server').insert({...data, update_required: data.managed ? 1 : 0});
    return "Server added";
  }

  update = async data => {
    const updatableKeys = ['name', 'dns_ip', 'dns_fqdn', 'managed', 'ssh_host', 'ssh_pass', 'ssh_user', 'config_path', 'active'];
    if( ! data.hasOwnProperty('ID') ) throw Error("missing key in input data object");
    if( data.hasOwnProperty('dns_ip') && ! APP.util.validateIP(data.dns_ip) ) throw Error("invalid ip address");
    if( data.hasOwnProperty('dns_fqdn') && ! APP.util.validateFQDN(data.dns_fqdn) ) throw Error("invalid nameserver fqdn");
    if( data.hasOwnProperty('name') ) {
      // server name validation
      data.name = data.name.trim();
      if( ! APP.util.validateServerName(data.name) ) throw Error("server name not within allowed length (2-100 chars)");
      // server name or ip already exists?
      const rs = await this.db('server').whereNot('ID', data.ID).where( function() { this.where('name', data.name).orWhere('dns_ip', data.dns_ip); });
      if( rs.length > 0 ) throw Error("server name or ip already exists");
    }
    // ACT: validate ssh connect options here
    // ACT: validate config path here
    // ACT: maybe test connection through some ssh lib... idk
    const id = data.ID;
    delete data['ID'];
    if( data.hasOwnProperty('config_path') ) data.config_path = data.config_path.replace(/\/$/, '');
    if( data.hasOwnProperty('managed') ) data.update_required = data.managed ? data.update_required : 0;
    // Update database
    Object.keys(data).forEach((key) => updatableKeys.includes(key) || delete data[key]);
    await this.db('server').where('ID', id).update(data);
    return "Server information updated";
  }

  delete = async data => {
    if( ! data.hasOwnProperty('ID') ) throw Error("missing key in input data object");
    // server exists?
    const servers = await this.db('server').where('ID', data.ID);
    if( ! servers ) throw Error("server does not exist");
    // member of nsgroups?
    const members = await this.db('ns_group_member').where('server_id', data.ID);
    if( ! members ) throw Error("This server is still a member of a nameserver group");
    // execute
    await this.db('server').where('ID', data.ID).del();
    return "Server deleted";
  }

}
