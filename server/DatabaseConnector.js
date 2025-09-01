const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

module.exports = {

  knex: null,

  async init() {
    // Remove obsolete SQLite database file if present
    const sqlitePath = path.join(__dirname, 'data', 'system.db');
    if (fs.existsSync(sqlitePath)) {
      try {
        fs.unlinkSync(sqlitePath);
        console.log('Removed obsolete SQLite database file: server/data/system.db');
      } catch (e) {
        console.warn('Failed to remove old SQLite DB:', e.message);
      }
    }

    await this.connect();
    await this.checkDatabase();
    await this.upgrade();
  },

  async connect() {
    // Load database configuration
    const configPath = path.join(__dirname, 'config', 'database.yml');
    if (!fs.existsSync(configPath)) {
      throw new Error('Database configuration file not found: ' + configPath);
    }
    
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configFile);

    // Ensure database exists (connect without DB first)
    const tempKnex = require('knex')({
      client: 'mysql2',
      connection: {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        charset: config.database.charset,
        timezone: config.database.timezone
      },
      pool: config.pool,
      debug: false
    });

    try {
      const dbName = config.database.database;
      const charset = config.database.charset || 'utf8mb4';
      // Use Knex schema builder for database creation
      await tempKnex.schema.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET ${charset}`);
    } finally {
      await tempKnex.destroy();
    }
    
    this.knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        charset: config.database.charset,
        timezone: config.database.timezone
      },
      pool: config.pool,
      debug: false
    });
  },

  async checkDatabase() {
    try {
      // Check if all required tables exist using Knex schema
      const requiredTables = ['acl', 'user', 'server', 'zone', 'view', 'audit'];
      const existingTables = [];
      
      for (const table of requiredTables) {
        if (await this.knex.schema.hasTable(table)) {
          existingTables.push(table);
        }
      }
      
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));
      
      if (missingTables.length > 0) {
        console.log(`Missing tables: ${missingTables.join(', ')}`);
        await this.setup();
      } else {
        console.log("All required database tables found, skipping initialization");
      }
    } catch (error) {
      console.error("Database connection error:", error.message);
      throw error;
    }
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
