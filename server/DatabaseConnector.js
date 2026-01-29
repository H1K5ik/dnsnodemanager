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
    
    const hasTable = await this.knex.schema.hasTable('user_ns_group_access');
    if (!hasTable) {
      await this.knex.raw("CREATE TABLE user_ns_group_access (user_id INTEGER REFERENCES user (ID), group_id INTEGER REFERENCES ns_group (ID), PRIMARY KEY (user_id, group_id))");
    }

    const hasZoneDeleteQueue = await this.knex.schema.hasTable('zone_delete_queue');
    if (!hasZoneDeleteQueue) {
      await this.knex.raw(`CREATE TABLE zone_delete_queue (
        ns_group   INTEGER REFERENCES ns_group (ID),
        filename   VARCHAR (255),
        server_id  INTEGER REFERENCES server (ID)
      )`);
    }
    if (hasZoneDeleteQueue) {
      try {
        await this.knex.raw('ALTER TABLE zone_delete_queue ADD COLUMN server_id INTEGER REFERENCES server(ID)');
      } catch (e) {
        if (!e.message || !e.message.includes('duplicate column')) throw e;
      }
    }
  }

}
