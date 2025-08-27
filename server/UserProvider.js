const bcrypt = require('bcrypt');

module.exports = class UserProvider {

  constructor(db) {
    this.db = db;
  }

  get = id => {
    return this.db('user').where('ID', parseInt(id));
  }

  list = () => {
    return this.db.table('user');
  }

  add = async data => {
    if( ! APP.util.validateKeys(['name', 'password', 'role'], data) ) throw Error("missing key in input data object");
    // check inputs
    data.name = data.name.trim();
    if( ! APP.util.validateUsername(data.name) ) throw Error("invalid username (3-50 chars)");
    if( ! APP.util.validatePassword(data.password) ) throw Error("Minimum password length = 8 characters");
    if( ! APP.util.validateUserRole(data.role) ) throw Error("Invalid user role");
    // insert user
    const saltRounds = 10;
    const hash = await bcrypt.hash(data.password, saltRounds);
    await this.db('user').insert({name: data.name, role: data.role, secret: hash});
    return "User added";
  }

  update = async data => {
    let hash;
    if( ! APP.util.validateKeys(['ID', 'name', 'password', 'role'], data) ) throw Error("missing key in input data object");
    data.name = data.name.trim();
    // check inputs
    if( ! APP.util.validateUsername(data.name) ) throw Error("invalid username (3-50 chars)");
    if( ! APP.util.validateUserRole(data.role) ) throw Error("Invalid user role");
    // user id exists? load current user data
    const rs = await this.get(data.ID);
    if( ! rs ) throw Error("Invalid user ID");
    // on password change -- check new password
    if( data.password.length > 0 ) {
      if( ! APP.util.validatePassword(data.password) ) throw Error("Minimum password length = 8 characters");
      const saltRounds = 10;
      hash = await bcrypt.hash(data.password, saltRounds);
    } else {
      // no password change: use old hash
      hash = rs.secret;
    }
    // update user
    await this.db('user').where('ID', data.ID).update({name: data.name, role: data.role, secret: hash});
    return "User updated";
  }

  delete = async (data, request) => {
    const users  = await this.list();
    const admins = users.filter(user => (user.role === 'sysadmin'));
    // User exists?
    if( ! data.hasOwnProperty('ID') ) throw Error("missing key in input data object");
    const user = await this.get(data.ID);
    if( ! user ) throw Error("Invalid user");
    // can't delete the last sysadmin user
    if( user.role === 'sysadmin' && admins.length <= 1 ) throw Error("Can't delete the last system admin user");
    // can't delete oneself
    if( request.user.ID === data.ID ) throw Error("Can't delete current user");
    // delete user from db
    await this.db('user').where('ID', data.ID).del();
    return "User was deleted";
  }

}
