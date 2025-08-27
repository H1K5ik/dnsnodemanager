const ManagedServer = require('./ManagedServer');

module.exports = {

  async init() {

    const db = APP.database.knex;

    setInterval( () => {
      db('server').where('managed', 1).then( servers => {
        servers.forEach( serverData => {
          const server = new ManagedServer(db);
          server.setFromObject(serverData);
          server.execSshChecks().then( checkResults => {
            const updates = { last_status: checkResults.success };
            if( checkResults.success ) updates.last_connection = db.fn.now();
            db('server').where('ID', serverData.ID).update(updates).then( () => {
              console.log('SSH Health Check for ' + serverData.name + ': ' + (checkResults.success ? 'OK' : 'FAIL'));
            } );
          } );
        } );
      } );
    }, 3600*1000);

  }

}
