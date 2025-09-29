const bcrypt = require('bcrypt');

async function DatabaseCreator(db) {
  // Create independent tables first (no foreign keys)
  
  // ACL table
  if (!(await db.schema.hasTable('acl'))) {
    await db.schema.createTable('acl', table => {
      table.increments('ID').primary();
      table.string('name', 100);
      table.text('members');
    });
  }

  // Forwarder table
  if (!(await db.schema.hasTable('forwarder'))) {
    await db.schema.createTable('forwarder', table => {
      table.increments('ID').primary();
      table.string('name', 100);
      table.text('members');
    });
  }

  // NS Group table
  if (!(await db.schema.hasTable('ns_group'))) {
    await db.schema.createTable('ns_group', table => {
      table.increments('ID').primary();
      table.string('name', 100);
    });
  }

  // Server table
  if (!(await db.schema.hasTable('server'))) {
    await db.schema.createTable('server', table => {
      table.increments('ID').primary();
      table.string('name', 100).notNullable();
      table.string('dns_fqdn', 254);
      table.string('dns_ip', 15).notNullable();
      table.boolean('managed');
      table.boolean('active').defaultTo(true);
      table.string('ssh_host', 250);
      table.string('ssh_user', 50);
      table.string('ssh_pass', 250);
      table.string('config_path', 200);
      table.boolean('last_status');
      table.text('last_connection');
      table.text('last_sync');
      table.boolean('update_required').defaultTo(false);
    });
  }

  // User table
  if (!(await db.schema.hasTable('user'))) {
    await db.schema.createTable('user', table => {
      table.increments('ID').primary();
      table.string('name', 50);
      table.text('secret');
      table.string('role', 50);
    });
  }

  // View table
  if (!(await db.schema.hasTable('view'))) {
    await db.schema.createTable('view', table => {
      table.string('name', 255).primary();
      table.integer('ttl').defaultTo(3600);
      table.string('soa_rname', 250).defaultTo('hostmaster.example.org');
      table.integer('soa_refresh').defaultTo(86400);
      table.integer('soa_retry').defaultTo(7200);
      table.integer('soa_expire').defaultTo(3600000);
      table.integer('soa_ttl').defaultTo(1800);
      table.text('config');
    });
  }

  // Create dependent tables (with foreign keys)
  
  // ACL Usage table
  if (!(await db.schema.hasTable('acl_usage'))) {
    await db.schema.createTable('acl_usage', table => {
      table.string('type', 20);
      table.integer('acl_id').unsigned().references('ID').inTable('acl');
      table.integer('user_id');
    });
  }

  // NS Group Member table
  if (!(await db.schema.hasTable('ns_group_member'))) {
    await db.schema.createTable('ns_group_member', table => {
      table.integer('server_id').unsigned().references('ID').inTable('server').unique();
      table.integer('group_id').unsigned().references('ID').inTable('ns_group');
      table.boolean('hidden').defaultTo(false);
      table.boolean('primary').defaultTo(false);
      table.integer('source_id').unsigned().references('ID').inTable('server');
      table.primary(['server_id', 'group_id']);
    });
  }

  // Zone table
  if (!(await db.schema.hasTable('zone'))) {
    await db.schema.createTable('zone', table => {
      table.increments('ID').primary();
      table.string('view', 255).defaultTo('default').references('name').inTable('view');
      table.string('fqdn', 255);
      table.string('type', 50).defaultTo('authoritative');
      table.integer('ns_group').unsigned().references('ID').inTable('ns_group');
      table.integer('forwarder_group');
      table.string('comment', 255);
      table.text('config');
      table.string('soa_rname', 255);
      table.integer('soa_serial').defaultTo(1);
      table.integer('soa_refresh');
      table.integer('soa_retry');
      table.integer('soa_expire');
      table.integer('soa_ttl');
      table.integer('ttl');
      table.boolean('frozen').defaultTo(false);
      table.timestamp('last_mod').defaultTo(db.fn.now());
    });
  }

  // Record table
  if (!(await db.schema.hasTable('record'))) {
    await db.schema.createTable('record', table => {
      table.increments('ID').primary();
      table.integer('zone_id').unsigned().references('ID').inTable('zone');
      table.string('name', 253);
      table.string('type', 10);
      table.string('data', 253);
      table.integer('ttl');
    });
  }

  // Audit table
  if (!(await db.schema.hasTable('audit'))) {
    await db.schema.createTable('audit', table => {
      table.timestamp('timestamp').defaultTo(db.fn.now());
      table.string('user', 100);
      table.string('role', 30);
      table.string('method', 10);
      table.string('action', 100);
      table.text('data');
    });
  }

  // Insert default data only if not exists
  const existingAdmin = await db('user').where('name', 'admin').first();
  if (!existingAdmin) {
    const defaultAdminHash = bcrypt.hashSync('admin123', 10);
    await db('user').insert({name: 'admin', secret: defaultAdminHash, role: 'sysadmin'});
    console.log("Admin user created");
  }
  
  const existingView = await db('view').where('name', 'default').first();
  if (!existingView) {
    await db('view').insert({name: 'default'});
    console.log("Default view created");
  }
  
  return true;
}

module.exports = DatabaseCreator;
