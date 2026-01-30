const fs = require('fs');
const csv = require('csv');
const path = require('path');
const BindParser = require('./BindParser');
const ServerProvider = require('./ServerProvider');
const NsGroupProvider = require('./NsGroupProvider');
const ViewProvider = require('./ViewProvider');
const ZoneProvider = require('./ZoneProvider');
const AclProvider = require('./AclProvider');
const FwdGroupProvider = require('./FwdGroupProvider');
const UserProvider = require('./UserProvider');

module.exports = {

  async init() {

    const server = APP.webserver.server;
    const router = APP.webserver.router;

    this.serverProvider = new ServerProvider(APP.database.knex);
    this.nsGroupProvider = new NsGroupProvider(APP.database.knex);
    this.viewProvider = new ViewProvider(APP.database.knex);
    this.zoneProvider = new ZoneProvider(APP.database.knex);
    this.aclProvider = new AclProvider(APP.database.knex);
    this.fwdGroupProvider = new FwdGroupProvider(APP.database.knex);
    this.userProvider = new UserProvider(APP.database.knex);

    // Authentication Routes
    router.post('/LOGIN', APP.auth.checkLoginFields, APP.auth.processLocalLogin, APP.auth.processADLogin, APP.auth.failLogin);
    router.post('/LOGOUT', APP.auth.processLogout);

    // General App Info
    router.get('/SESSION', (request, response) => {
      const anonymousUser = { name: 'anonymous', role: null };
      if( request.user ) {
        APP.api.dataResponse(response, request.user);
      } else {
        if( ! APP.config.auth.local.enabled && ! APP.config.auth.activeDirectory.enabled ) {
          anonymousUser.role = 'sysadmin';
          request.login( anonymousUser, function() {
            console.log("Anonymous login due to no configured authentication method.");
            return APP.api.dataResponse(response, anonymousUser);
          } );
        } else APP.api.dataResponse(response, anonymousUser);
      }
    });

    router.get('/APPINFO', (request, response) => {
      const rrFile = fs.readFileSync(path.join(__dirname, 'RRTypes.json'));
      APP.api.dataResponse(response, {
        appVersion: APP.info.version,
        rrTypes: JSON.parse(rrFile),
      });
    });

    router.get('/SSHPUBKEY', APP.auth.ensureLogin, (request, response) => {
      const pubKey = fs.readFileSync('data/id_rsa.pub', 'utf8');
      APP.api.dataResponse(response, {pubKey: pubKey});
    });

    router.get('/AUDIT_LOG', APP.auth.ensureRole('sysadmin'), (request, response) => {
      APP.database.knex('audit').select('*').orderBy('timestamp', 'desc').then( data => {
        APP.api.dataResponse(response, data);
      } );
    });

    router.get('/STATS', APP.auth.ensureLogin, (request, response) => {
      APP.database.knex.raw(`SELECT
        (SELECT COUNT(*) FROM view) AS viewCount,
        (SELECT COUNT(*) FROM zone) AS zoneCount,
        (SELECT COUNT(*) FROM record) AS recordCount,
        (SELECT COUNT(*) FROM server) AS serverCount`).then( data => {
          APP.api.dataResponse(response, data[0]);
        } );
    });

    // Servers
    router.get('/SERVERS', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.serverProvider.list));
    router.get('/SERVER/:first/SSH_HEALTH', APP.auth.ensureLogin, this.processRequestAsync(this.serverProvider.testSSH));
    router.post('/SERVER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.serverProvider.add));
    router.patch('/SERVER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.serverProvider.update));
    router.delete('/SERVER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.serverProvider.delete));
    router.post('/SERVER/SYNC', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.serverProvider.forceSync));
    router.post('/ROLLOUT', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.serverProvider.syncPending));

    // Nameserver Groups
    router.get('/NSGROUPS/LIST', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.nsGroupProvider.list));
    router.get('/NSGROUPS/TREE', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.nsGroupProvider.tree));
    router.get('/NSGROUP/:first/MEMBERS', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.nsGroupProvider.getMembers));
    router.post('/NSGROUP/MEMBER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.addMember));
    router.post('/NSGROUP', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.add));
    router.patch('/NSGROUP/PRIMARY', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.setPrimary));
    router.patch('/NSGROUP/MEMBER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.updateMember));
    router.patch('/NSGROUP', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.update));
    router.delete('/NSGROUP/MEMBER', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.deleteMember));
    router.delete('/NSGROUP', APP.auth.ensureRole('dnsadmin'), this.processActionAsync(this.nsGroupProvider.delete));
    
    // User NS Group Access Management (for System Admin)
    router.get('/USER/:first/NSGROUPACCESS', APP.auth.ensureRole('sysadmin'), this.processRequestAsync(this.nsGroupProvider.getUserAccess));
    router.get('/NSGROUPS/ALL', APP.auth.ensureRole('sysadmin'), this.processRequestAsync(this.nsGroupProvider.getAllGroupsForAccess));
    router.post('/USER/NSGROUPACCESS', APP.auth.ensureRole('sysadmin'), this.processActionAsync(this.nsGroupProvider.setUserAccess));

    // Views
    router.get('/VIEWS', APP.auth.ensureLogin, this.processRequestAsync(this.viewProvider.list));
    router.post('/VIEW', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.viewProvider.add));
    router.patch('/VIEW', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.viewProvider.update));
    router.delete('/VIEW', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.viewProvider.delete));

    // ACLs
    router.get('/ACLS', APP.auth.ensureLogin, this.processRequestAsync(this.aclProvider.list));
    router.post('/ACL', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.aclProvider.add));
    router.patch('/ACL', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.aclProvider.update));
    router.delete('/ACL', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.aclProvider.delete));

    // Forwarder Groups
    router.get('/FWDGROUPS', APP.auth.ensureLogin, this.processRequestAsync(this.fwdGroupProvider.list));
    router.post('/FWDGROUP', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.fwdGroupProvider.add));
    router.patch('/FWDGROUP', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.fwdGroupProvider.update));
    router.delete('/FWDGROUP', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.fwdGroupProvider.delete));

    // Zones n Records
    router.get('/ZONES', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.zoneProvider.list));
    router.get('/ZONE/:first/RECORDS', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.zoneProvider.listRecords));
    router.get('/ZONE/:first/PREVIEW', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.zoneProvider.preview));
    router.get('/ZONE/:first', APP.auth.ensureLogin, this.processRequestAsyncWithUser(this.zoneProvider.get));
    router.post('/ZONE', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.add));
    router.patch('/ZONE/SYNC', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.zoneProvider.sync));
    router.patch('/ZONE/FREEZE', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.zoneProvider.freeze));
    router.patch('/ZONE/THAW', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.zoneProvider.thaw));
    router.patch('/ZONE', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.update));
    router.delete('/ZONES', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.delete));
    router.post('/RECORD', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.addRecord));
    router.patch('/RECORDS', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.updateRecords));
    router.patch('/RECORD', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.updateRecord));
    router.delete('/RECORDS', APP.auth.ensureRole('dnsop'), this.processActionAsyncWithUser(this.zoneProvider.deleteRecords));

    // Imports
    router.post('/ZONES/CONVERTCSV', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.analyzeImportZonesCSV));
    router.post('/ZONES/CONVERTBIND', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.analyzeImportZonesFile));
    router.post('/ZONES/IMPORT', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.zoneProvider.import));
    router.post('/RECORDS/CONVERTCSV', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.analyzeImportRecordsCSV));
    router.post('/RECORDS/CONVERTBIND', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.analyzeImportRecordsFile));
    router.post('/RECORDS/IMPORT', APP.auth.ensureRole('dnsop'), this.processActionAsync(this.zoneProvider.importRecords));

    // Users
    router.get('/USERS', APP.auth.ensureRole('sysadmin'), this.processRequestAsync(this.userProvider.list));
    router.post('/USER', APP.auth.ensureRole('sysadmin'), this.processActionAsync(this.userProvider.add));
    router.patch('/USER', APP.auth.ensureRole('sysadmin'), this.processActionAsync(this.userProvider.update));
    router.delete('/USER', APP.auth.ensureRole('sysadmin'), this.processActionAsync(this.userProvider.delete));

  },

  processActionAsync: handlerFunction => (req, res, next) => {
    handlerFunction(req.body, req).then( result => {
      const logUser = req.user ? req.user.name : 'anonymous';
      const logRole = req.user ? req.user.role : 'sysadmin';
      APP.logger.addAuditLog(req.method, req.url, JSON.stringify(req.body), logUser, logRole).then( () => {
        switch(typeof result) {
          case "object":
          case "array":
            APP.api.dataResponse(res, result, "success");
            break;
          default:
            APP.api.successResponse(res, result);
            break;
        }
      } );
    } ).catch( error => {
      APP.api.handleApiError(res, error);
    } );
  },

  processActionAsyncWithUser: handlerFunction => (req, res, next) => {
    handlerFunction(req.body, req).then( result => {
      const logUser = req.user ? req.user.name : 'anonymous';
      const logRole = req.user ? req.user.role : 'sysadmin';
      const auditData = (result && typeof result === 'object' && result.auditData !== undefined)
        ? result.auditData
        : JSON.stringify(req.body);
      APP.logger.addAuditLog(req.method, req.url, auditData, logUser, logRole).then( () => {
        switch(typeof result) {
          case "object":
          case "array":
            APP.api.dataResponse(res, result, "success");
            break;
          default:
            APP.api.successResponse(res, result);
            break;
        }
      } );
    } ).catch( error => {
      APP.api.handleApiError(res, error);
    } );
  },

  processRequestAsync: handlerFunction => (req, res, next) => {
    const first = req.params.first;
    const second = req.params.second;
    handlerFunction(first, second).then( result => {
      APP.api.dataResponse(res, result);
    } ).catch( error => {
      APP.api.handleApiError(res, error);
    } );
  },

  processRequestAsyncWithUser: handlerFunction => (req, res, next) => {
    const first = req.params.first;
    const second = req.params.second;
    if (first === undefined) {
      handlerFunction(req).then( result => {
        APP.api.dataResponse(res, result);
      } ).catch( error => {
        APP.api.handleApiError(res, error);
      } );
    } else if (second === undefined) {
      handlerFunction(first, req).then( result => {
        APP.api.dataResponse(res, result);
      } ).catch( error => {
        APP.api.handleApiError(res, error);
      } );
    } else {
      handlerFunction(first, second, req).then( result => {
        APP.api.dataResponse(res, result);
      } ).catch( error => {
        APP.api.handleApiError(res, error);
      } );
    }
  },

  dataResponse(response, data, message = null) {
    const json = message !== null ? {success: true, data: data, message: message} : {success: true, data: data};
    response.json(json);
  },

  successResponse(response, message) {
    response.json({success: true, message: message});
  },

  errorResponse(response, message) {
    response.json({success: false, message: message});
  },

  handleApiError(response, error) {
    console.log(error);
    this.errorResponse(response, error.toString());
  },

  analyzeImportRecordsFile: async (data, request) => {
    // Validate uploaded file
    if( ! APP.util.validateFileUpload(request.files, 'file') ) throw Error('No file uploaded');
    // Spawn parser object
    const parser = new BindParser();
    parser.setContent(request.files.file.data.toString().replace(/\r\n|\r|\n/g, '\n'));
    return { records: parser.getRecords(), soa: parser.getSoa() };
  },

  analyzeImportRecordsCSV: async (data, request) => {
    let i, j, row;
    if( ! APP.util.validateFileUpload(request.files, 'file') ) throw Error('No file uploaded');
    // Process uploaded file
    const content = request.files.file.data.toString().replace(/\r\n|\r|\n/g, '\n');
    const parser = new Promise( (resolve, reject) => {
      csv.parse( content, {trim: true, skip_empty_lines: true}, (error, records) => {
        console.log("error:", error);
        console.log("records:", records);
        resolve(records);
      } );
    } );
    const rows = await parser;
    const indices = { zone: null, name: null, type: null, data: null, ttl: null };
    // Get Header Keys
    for( j = 0; j < rows[0].length; j++ ) {
      if( ! indices.hasOwnProperty(rows[0][j]) ) continue;
      indices[rows[0][j]] = j;
    }
    if( [indices.zone, indices.name, indices.type, indices.data].includes(null) ) throw Error('CSV header invalid');
    // Get Records
    const records = [];
    for( i = 1; i < rows.length; i++ ) {
      records.push({
        zone: rows[i][indices.zone],
        type: rows[i][indices.type],
        name: rows[i][indices.name],
        data: rows[i][indices.data],
        ttl: rows[i][indices.ttl] || null,
      });
    }
    return {records: records};
  },

  analyzeImportZonesFile: async (data, request) => {
    if( ! APP.util.validateFileUpload(request.files, 'file') ) throw Error('No file uploaded');
    // Process uploaded file
    const content = request.files.file.data.toString().replace(/\r\n|\r|\n/g, '\n');
    const pattern = /zone\s+([0-9A-Za-z\.\"\-]+)\s+[inIN\s]*\{.+?type\s+(master|slave|forward|stub);/gs;
    const matches = content.matchAll(pattern);
    const zones = [];
    for( const match of matches ) {
      if( ['stub'].includes(match[2]) ) continue;
      zones.push({
        fqdn: match[1].replace(/[\"\']/g, ''),
        type: ['master','slave'].includes(match[2]) ? 'authoritative' : 'forward',
        nsgroup: data.nsgroup,
        fwdgroup: match[2] === 'forward' ? data.fwdgroup : '',
        view: data.view,
        comment: ''
      });
    }
    return zones;
  },

  analyzeImportZonesCSV: async (data, request) => {
    let i, row;
    if( ! APP.util.validateFileUpload(request.files, 'file') ) throw Error('No file uploaded');
    // Process uploaded file
    const content = request.files.file.data.toString().replace(/\r\n|\r|\n/g, '\n');
    const parser = new Promise( (resolve, reject) => {
      csv.parse( content, {trim: true, columns: true, skip_empty_lines: true}, (error, rows) => {
        resolve(rows);
      } );
    } );
    const rows = await parser;
    // Check header
    const columns = Object.keys(rows[0]);
    if( ! ['fqdn', 'type', 'nsgroup'].every(column => columns.includes(column)) ) throw Error('CSV header invalid');
    // Get zones
    const zones = [];
    for( i = 0; i < rows.length; i++ ) {
      zones.push({
        fqdn: rows[i].fqdn.toLowerCase(),
        type: rows[i].type.toLowerCase(),
        nsgroup: rows[i].nsgroup,
        fwdgroup: rows[i].fwdgroup || '',
        view: rows[i].view || 'default',
        comment: rows[i].comment || ''
      });
    }
    return zones;
  }

}
