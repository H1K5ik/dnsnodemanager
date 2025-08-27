const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ADStrategy = require('passport-activedirectory');

module.exports = {

  async init() {

    passport.serializeUser((user, cb) => { cb(null, user); });
    passport.deserializeUser((user, cb) => { cb(null, user); });

    APP.config.auth.local.enabled && this.activateLocalStrategy();
    APP.config.auth.activeDirectory.enabled && this.activateADStrategy();

    APP.webserver.server.use(passport.initialize());
    APP.webserver.server.use(passport.session());

  },

  activateLocalStrategy() {
    passport.use( new LocalStrategy(
      function(username, password, cb) {
        APP.database.knex('user').where('name', username).first().then( async rs => {
          if( ! rs ) return cb(null, false);
          const isValid = await bcrypt.compare(password, rs.secret);
          if( ! isValid ) return cb(null, false);
          return cb(null, rs);
        } );
      }
    ) );
  },

  processLocalLogin(request, response, next) {
    if( ! APP.config.auth.local.enabled ) {
      next();
      return true;
    }
    passport.authenticate( 'local', function(error, user) {
      if( error !== null ) console.log(error);
      if( error === null && user !== false ) {
        request.login( user, () => {
          console.log("Local user logged in:", user.name);
          response.json({success: true, message: "Logged in"});
        } );
      } else next();
    } )(request, response, next);
  },

  activateADStrategy() {
    const adConf = APP.config.auth.activeDirectory;
    passport.use(
      new ADStrategy( {
        integrated: false,
        ldap: {
          url: adConf.url,
          baseDN: adConf.baseDN,
          username: adConf.username,
          password: adConf.password,
          tlsOptions: {
            rejectUnauthorized: !adConf.ignoreCertificate
          }
        }
      },
      function (profile, ad, cb) {
        const users = [];
        const resolvers = [];
        for( let mapping of adConf.mapping ) {
          switch(mapping.type) {
            case "user":
              resolvers.push(new Promise((resolve, reject) => {
                if( mapping.dn === profile._json.sAMAccountName ) users.push({name: profile._json.sAMAccountName, role: mapping.role});
                resolve(true);
              }));
            break;
            case "group":
              resolvers.push(new Promise((resolve, reject) => {
                ad.isUserMemberOf( profile._json.dn, mapping.dn, function (err, isMember) {
                  if( err ) console.log(err);
                  else if( isMember ) users.push({name: profile._json.sAMAccountName, role: mapping.role});
                  resolve(true);
                } );
              }));
            break;
          }
        }
        Promise.all(resolvers).then( () => {
          let user;
          for( let role of ['sysadmin', 'dnsadmin', 'dnsop', 'ro'] ) {
            user = users.find(usr => usr.role === role);
            if( user ) return cb(null, user);
          }
        } );
      } )
    );
  },

  processADLogin(request, response, next) {
    if( ! APP.config.auth.activeDirectory.enabled ) {
      next();
      return true;
    }
    passport.authenticate( 'ActiveDirectory', function(error, user) {
      if( error !== null ) {
        console.log("LDAP connection failed!");
        console.log(error);
      }
      if( error === null && user !== false ) {
        request.login( user, function() {
          console.log("LDAP user logged in:", user);
          response.json({success: true, message: "Logged in"});
        } );
      } else next();
    } )(request, response, next);
  },

  checkLoginFields(request, response, next) {
    if( ! request.body.hasOwnProperty('username') || ! request.body.hasOwnProperty('password') || request.body.username === '' || request.body.password === '' ) {
      response.json({success: false, message: "Authentication Failed"});
    } else next();
  },

  failLogin(request, response)  {
    response.json({success: false, message: "Authentication Failed"});
  },

  processLogout(request, response) {
    request.logout();
    response.json({success: true, message: "Logged out"});
  },

  ensureLogin(request, response, next) {
    if( request.isAuthenticated() ) next();
    else if( ! APP.config.auth.local.enabled && ! APP.config.auth.activeDirectory.enabled ) next();
    else response.json({success: false, data: null});
  },

  ensureRole(role) {
    const validRoleSets = {
            'ro': ['ro','dnsop','dnsadmin','sysadmin'],
         'dnsop': ['dnsop','dnsadmin','sysadmin'],
      'dnsadmin': ['dnsadmin','sysadmin'],
      'sysadmin': ['sysadmin']
    }
    return (request, response, next) => {
      if( request.isAuthenticated() ) {
        if( validRoleSets[role].includes(request.user.role) ) {
          next();
        } else {
          response.json({success: false, message: "Not enough privileges to run this command"});
        }
      } else if( ! APP.config.auth.local.enabled && ! APP.config.auth.activeDirectory.enabled ) {
        next();
      } else {
        response.json({success: false, message: "Unauthorized access"});
      }
    };
  }

}
