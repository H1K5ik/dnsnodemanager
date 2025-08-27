const logger = require('morgan');
const rfs = require('rotating-file-stream');

module.exports = {

  async init() {

    // SQL Logging
    if( APP.config.logging.logSql ) APP.database.knex.on('query', function(q) { console.log(q.sql); });

    // Webserver Logs
    const accessLogStream = rfs.createStream('access.log', {
      interval: APP.config.logging.web.rotate,
      path: APP.config.logging.web.accessLogPath,
    });
    APP.webserver.server.use(logger('combined', { stream: accessLogStream }));

    // Audit log cleanup
    setInterval(this.cleanupAuditLog, 24*3600*1000);
    setTimeout(this.cleanupAuditLog, 600*1000);

  },

  cleanupAuditLog() {
    APP.database.knex('audit').whereRaw(`strftime('%s', 'now') - strftime('%s', timestamp) > ${APP.config.logging.auditRetentionDays} * 24 * 3600`).del().then( rs => {
      console.log(`Ran audit log cleanup (retention period: ${APP.config.logging.auditRetentionDays} days) and deleted ${rs} records.`);
    } );
  },

  addAuditLog(method, action, data, user, role) {
    return APP.database.knex('audit').insert({method: method, action: action, data: data, user: user, role: role});
  }

}
