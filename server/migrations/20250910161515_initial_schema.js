
exports.up = function(knex) {
  return knex.schema
    // Создаем независимые таблицы (без внешних ключей)
    .createTable('acl', table => {
      table.increments('ID').primary();
      table.string('name', 100);
      table.text('members');
    })
    .createTable('forwarder', table => {
      table.increments('ID').primary();
      table.string('name', 100);
      table.text('members');
    })
    .createTable('ns_group', table => {
      table.increments('ID').primary();
      table.string('name', 100);
    })
    .createTable('server', table => {
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
    })
    .createTable('user', table => {
      table.increments('ID').primary();
      table.string('name', 50);
      table.text('secret');
      table.string('role', 50);
    })
    .createTable('view', table => {
      table.string('name', 255).primary();
      table.integer('ttl').defaultTo(3600);
      table.string('soa_rname', 250).defaultTo('hostmaster.example.org');
      table.integer('soa_refresh').defaultTo(86400);
      table.integer('soa_retry').defaultTo(7200);
      table.integer('soa_expire').defaultTo(3600000);
      table.integer('soa_ttl').defaultTo(1800);
      table.text('config');
    })
    // Создаем зависимые таблицы (с внешними ключами)
    .createTable('acl_usage', table => {
      table.string('type', 20);
      table.integer('acl_id').unsigned().references('ID').inTable('acl');
      table.integer('user_id');
    })
    .createTable('ns_group_member', table => {
      table.integer('server_id').unsigned().references('ID').inTable('server');
      table.integer('group_id').unsigned().references('ID').inTable('ns_group');
      table.boolean('hidden').defaultTo(false);
      table.boolean('primary').defaultTo(false);
      table.integer('source_id').unsigned().references('ID').inTable('server');
      table.primary(['server_id', 'group_id']);
    })
    .createTable('zone', table => {
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
      table.timestamp('last_mod').defaultTo(knex.fn.now());
    })
    .createTable('record', table => {
      table.increments('ID').primary();
      table.integer('zone_id').unsigned().references('ID').inTable('zone');
      table.string('name', 253);
      table.string('type', 10);
      table.string('data', 253);
      table.integer('ttl');
    })
    .createTable('audit', table => {
      table.timestamp('timestamp').defaultTo(knex.fn.now());
      table.string('user', 100);
      table.string('role', 30);
      table.string('method', 10);
      table.string('action', 100);
      table.text('data');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('audit')
    .dropTableIfExists('record')
    .dropTableIfExists('zone')
    .dropTableIfExists('ns_group_member')
    .dropTableIfExists('acl_usage')
    .dropTableIfExists('view')
    .dropTableIfExists('user')
    .dropTableIfExists('server')
    .dropTableIfExists('ns_group')
    .dropTableIfExists('forwarder')
    .dropTableIfExists('acl');
};
