// DnsNodeManager
// Backend

global.APP = {
  info: require('./package.json'),
  config: require('./ConfigParser'),
  setup: require('./AppSetup'),
  database: require('./DatabaseConnector'),
  webserver: require('./Webserver'),
  logger: require('./Logger'),
  auth: require('./Authenticaton'),
  util: require('./Util'),
  api: require('./ApiRouter'),
  scheduler: require('./Scheduler'),
  init: async () => {
    console.log(`Starting DnsNodeManager ${APP.info.version} ...`);
    await APP.config.init();
    await APP.setup.init();
    await APP.database.init();
    await APP.webserver.init();
    await APP.auth.init();
    await APP.api.init();
    await APP.logger.init();
  }
}

APP.init().then( () => {
  APP.webserver.serveApi();
  APP.webserver.serveFrontend();
  APP.webserver.listen();
} );
