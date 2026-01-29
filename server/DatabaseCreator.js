async function DatabaseCreator(db) {
  await db.raw("CREATE TABLE acl (ID INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR (100), members TEXT)");
  await db.raw("CREATE TABLE acl_usage (type VARCHAR (20), acl_id INTEGER REFERENCES acl (ID), user_id INTEGER)");
  await db.raw("CREATE TABLE forwarder (ID INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR (100), members TEXT)");
  await db.raw("CREATE TABLE ns_group (ID INTEGER PRIMARY KEY AUTOINCREMENT, name VARCHAR (100))");
  await db.raw("CREATE TABLE ns_group_member (server_id INTEGER REFERENCES server (ID), group_id  INTEGER REFERENCES ns_group (ID), hidden BOOLEAN DEFAULT (0), [primary] BOOLEAN DEFAULT (0), source_id INT REFERENCES server (ID), PRIMARY KEY (server_id, group_id))");
  await db.raw("CREATE TABLE user_ns_group_access (user_id INTEGER REFERENCES user (ID), group_id INTEGER REFERENCES ns_group (ID), PRIMARY KEY (user_id, group_id))");
  await db.raw("CREATE TABLE record (ID INTEGER PRIMARY KEY AUTOINCREMENT, zone_id INTEGER REFERENCES zone (ID), name VARCHAR (253), type VARCHAR (10), data VARCHAR (253), ttl INTEGER)");
  await db.raw(`CREATE TABLE server (
    ID              INTEGER       PRIMARY KEY AUTOINCREMENT,
    name            VARCHAR (100) NOT NULL,
    dns_fqdn        VARCHAR (254),
    dns_ip          VARCHAR (15)  NOT NULL,
    managed         BOOLEAN,
    active          BOOLEAN       DEFAULT (1),
    ssh_host        VARCHAR (250),
    ssh_user        VARCHAR (50),
    ssh_pass        VARCHAR (250),
    config_path     VARCHAR (200),
    last_status     BOOLEAN,
    last_connection TEXT,
    last_sync       TEXT,
    update_required BOOLEAN       DEFAULT (0)
  )`);
  await db.raw(`CREATE TABLE user (
    ID     INTEGER      PRIMARY KEY AUTOINCREMENT,
    name   VARCHAR (50),
    secret TEXT,
    role   VARCHAR (50)
  )`);
  await db.raw(`CREATE TABLE [view] (
    name        VARCHAR       PRIMARY KEY,
    ttl         INTEGER       DEFAULT (3600),
    soa_rname   VARCHAR (250) DEFAULT [hostmaster.example.org],
    soa_refresh INTEGER       DEFAULT (86400),
    soa_retry   INTEGER       DEFAULT (7200),
    soa_expire  INTEGER       DEFAULT (3600000),
    soa_ttl     INTEGER       DEFAULT (1800),
    config      TEXT          DEFAULT ('')
  )`);
  await db.raw(`CREATE TABLE zone (
    ID              INTEGER       PRIMARY KEY AUTOINCREMENT,
    [view]          VARCHAR       DEFAULT [default]
                                  REFERENCES [view] (name),
    fqdn            VARCHAR (255),
    type            VARCHAR       DEFAULT authoritative,
    ns_group        INTEGER       REFERENCES ns_group (ID),
    forwarder_group INTEGER,
    comment         VARCHAR (255),
    config          TEXT,
    soa_rname       VARCHAR (255),
    soa_serial      INTEGER       DEFAULT (1),
    soa_refresh     INTEGER,
    soa_retry       INTEGER,
    soa_expire      INTEGER,
    soa_ttl         INTEGER,
    ttl             INTEGER,
    frozen          BOOLEAN       DEFAULT (0),
    last_mod        TEXT
  )`);
  await db.raw(`CREATE TABLE zone_delete_queue (
    ns_group   INTEGER REFERENCES ns_group (ID),
    filename   VARCHAR (255),
    server_id  INTEGER REFERENCES server (ID)
  )`);
  await db.raw(`CREATE TABLE audit (
    timestamp DATETIME      DEFAULT (CURRENT_TIMESTAMP),
    user      VARCHAR (100),
    role      VARCHAR (30),
    method    VARCHAR (10),
    [action]  VARCHAR (100),
    data      TEXT
  )`);
  await db('user').insert({name: 'admin', secret: '$2a$10$/5ipabGT3LeTJQiMnUs/zuF9O9vPkhg4C5p1JGrvTKpn.7yeiqioC', role: 'sysadmin'}); // pass: dnsnmadmin1
  await db('view').insert({name: 'default'});
  return true;
}

module.exports = DatabaseCreator;
