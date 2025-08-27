const fs = require('fs');
const path = require('path');
const dbfile = 'data/system.db';

module.exports = {

  knex: null,

  async init() {
    await this.connect();
    if( ! fs.existsSync(dbfile) || fs.statSync(dbfile)["size"] === 0 ) {
      console.log("No existing database found!");
      await this.setup();
    }
    await this.upgrade();
  },

  async connect() {
    this.knex = require('knex')( {
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: { filename: dbfile }
    } );
  },

  async setup() {
    console.log("Initializing new database layout...");
    const databaseCreator = require('./DatabaseCreator');
    const result = await databaseCreator(this.knex);
    console.log("Done! New database layout created :)");
	return result;
  },

  async upgrade() {
    // 0.4.1
    //  fixes bug in 0.4.0
    await this.knex('zone').whereNot('type', 'forward').update('forwarder_group', null);
  }

}
