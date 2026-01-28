const fs = require("fs");
const { execSync } = require('child_process');
const path = require('path');
const NodeSSH = require('node-ssh').NodeSSH;
const BindConfig = require('./BindConfig');
const BindParser = require('./BindParser');
const BindZoneFile = require('./BindZoneFile');

module.exports = class ManagedServer {

  configFileName = 'managedconfig.conf';

  db = null;
  info = null;
  serviceGroup = null;
  acls = [];
  views = [];
  nameservers = [];

  constructor(db) {
    this.db = db;
  }

  getConfigPath() {
    return this.info.config_path.replace(/\/$/, '');
  }

  async setFromId(id) {
    this.info = await this.db('server').where('ID', id).first();
    if( ! this.info ) throw Error('Unknown server id');
  }

  setFromObject(obj) {
    this.info = obj;
  }

  async loadDnsDetails() {
    this.nameservers = await this.getNsGroupMatrix();
    this.views = await this.db('view').select('*');
    this.acls = await this.db('acl_usage').where('type', 'dynamic_update').join('acl', 'acl.ID', 'acl_usage.acl_id').select('acl_usage.user_id', 'acl.ID', 'acl.members');
    return true;
  }

  async createConnection() {
    const ssh = new NodeSSH();
    const ssh_config = {
      host: this.info.ssh_host,
      port: 22,
      username: this.info.ssh_user,
      privateKey: './data/id_rsa',
    };
    if( this.info.ssh_pass !== null && this.info.ssh_pass.length > 0 ) {
      ssh_config.password = this.info.ssh_pass;
    }
    await ssh.connect(ssh_config);
    return ssh;
  }

  async testConnection() {
    const ssh = await this.createConnection();
    if( ssh.isConnected() ) {
      ssh.dispose();
      return true;
    }
    return false;
  }

  async testConfDirectory() {
    const ssh = await this.createConnection();
    const cmd = await ssh.execCommand(`if [ -w "${this.getConfigPath()}" ]; then echo "1"; else echo "0"; fi`);
    return Boolean(parseInt(cmd.stdout));
  }

  async testGroupMembership() {
    const ssh = await this.createConnection();
    const cmd = await ssh.execCommand(`id`);
    return cmd.stdout.includes('(bind)') || cmd.stdout.includes('(named)');
  }

  async testRndc() {
    const ssh = await this.createConnection();
    const cmd = await ssh.execCommand(`rndc status`);
    return !Boolean(cmd.code);
  }

  async execSshChecks() {
    const results = {
      success: false,
      sshConnection: null,
      confDirWritable: null,
      groupMembership: null,
      rndcCommands: null,
    };
    // SSH Login Check
    try {
      results.sshConnection = await this.testConnection();
    } catch(err) {
      results.sshConnection = err.toString();
      console.log("Error checking ssh connection:", err);
    }
    if( results.sshConnection !== true ) return results;
    // Configuration directory check
    results.confDirWritable = await this.testConfDirectory();
    if( results.confDirWritable !== true ) return results;
    // Group membership check
    results.groupMembership = await this.testGroupMembership();
    if( results.groupMembership !== true ) return results;
    // rndc command check
    results.rndcCommands = await this.testRndc();
    if( results.rndcCommands !== true ) return results;
    // final success
    results.success = true;
    return results;
  }

  async getServiceGroup(ssh) {
    if( this.serviceGroup !== null ) return this.serviceGroup;
    const cmd = await ssh.execCommand('id');
    if( cmd.stdout.includes('(bind)')  ) this.serviceGroup = 'bind';
    if( cmd.stdout.includes('(named)') ) this.serviceGroup = 'named';
    if( this.serviceGroup === null ) throw Error('couldnt set service group. invalid group membership?');
    return this.serviceGroup;
  }

  async freezeZone(fqdn, view = 'default') {
    let result;
    const ssh = await this.createConnection();
    result = await ssh.execCommand(`rndc freeze ${fqdn}`);
    if( result.stderr.includes('found in multiple views') ) {
      result = await ssh.execCommand(`rndc freeze ${fqdn} IN ${view}`);
    }
    return ! Boolean(result.code) || result.stderr.includes('already frozen');
  }

  async thawZone(fqdn, view = 'default') {
    let result;
    const ssh = await this.createConnection();
    result = await ssh.execCommand(`rndc thaw ${fqdn}`);
    if( result.stderr.includes('found in multiple views') ) {
      result = await ssh.execCommand(`rndc thaw ${fqdn} IN ${view}`);
    }
    return ! Boolean(result.code);
  }

  async syncZone(fqdn, view = 'default') {
    let result;
    const ssh = await this.createConnection();
    result = await ssh.execCommand(`rndc sync ${fqdn}`);

    if( result.stderr.includes('found in multiple views') ) {
      result = await ssh.execCommand(`rndc sync ${fqdn} IN ${view}`);
    }

    return ! Boolean(result.code);
  }

  async getRemoteFileContents(ssh, remoteFile) {
    await ssh.getFile("./tmp/test.txt", remoteFile);
    return fs.readFileSync("./tmp/test.txt", "utf8");
  }

  // FIX: Код захардкожен, нужен фикс пути ниже
  async installConfigFile(ssh, localFile, remoteFile) {
    await ssh.execCommand(`/bin/cp -f ${remoteFile} ${remoteFile}.bak`);
    await ssh.putFile(localFile, remoteFile);

    const checkconf = await ssh.execCommand('named-checkconf');

    console.log("Checkconf reports code " + checkconf.code);
    console.log("Checkconf stdout:", checkconf.stdout);
    console.log("Checkconf stderr:", checkconf.stderr);

    if( Boolean(checkconf.code) ) {
      await ssh.execCommand(`/bin/cp -f ${remoteFile}.bak ${remoteFile}`);
      throw Error('Failed to load new bind configuration: ' + checkconf.stdout);
    }

    console.log(`Uploaded ${this.getConfigPath()}/${this.configFileName}`);

    return true;
  }

  async installZoneFile(ssh, zoneFile) {
    const zonesDir = `${this.getConfigPath()}/zones`;
    const remoteFile = `${zonesDir}/${zoneFile.filename}`;
    
    await ssh.execCommand(`mkdir -p ${zonesDir}`);
    await ssh.execCommand(`chgrp ${await this.getServiceGroup(ssh)} ${zonesDir}`);
    await ssh.execCommand(`chmod 755 ${zonesDir}`);
    
    await ssh.putFile(`./tmp/${zoneFile.filename}`, remoteFile);
    await ssh.execCommand(`chgrp ${await this.getServiceGroup(ssh)} ${remoteFile}`);
    await ssh.execCommand(`chmod 664 ${remoteFile}`);

    console.log(`Uploaded ${remoteFile}`);

    const zoneCheck = await ssh.execCommand(`named-checkzone ${zoneFile.info.fqdn} ${remoteFile}`);

    console.log("Checkzone reports code " + zoneCheck.code);
    console.log("Checkzone stdout:", zoneCheck.stdout);
    console.log("Checkzone stderr:", zoneCheck.stderr);

    if( zoneCheck.code ) throw Error('Failed to load zonefile ' + zoneFile.info.fqdn + '. aborted.');

    return true;
  }

  async reloadServer(ssh) {
    const reloadCommand = await ssh.execCommand('rndc reload');

    console.log("rndc reports code " + reloadCommand.code);
    console.log("rndc stdout:", reloadCommand.stdout);
    console.log("rndc stderr:", reloadCommand.stderr);

    if( reloadCommand.code ) throw Error('Error reloading server' + this.info.name);
    return true;
  }

  async initGitRepo(repoPath) {
    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    // Проверяем, инициализирован ли git репозиторий
    const gitDir = path.join(tmpDir, '.git');
    if (!fs.existsSync(gitDir)) {
      try {
        execSync('git init', { cwd: tmpDir, stdio: 'inherit' });
        // Настраиваем git config если нужно
        try {
          execSync('git config user.name "DNS Manager"', { cwd: tmpDir });
          execSync('git config user.email "dnsmanager@localhost"', { cwd: tmpDir });
        } catch(e) {
          console.log('Warning: Could not set git config:', e.message);
        }
      } catch(e) {
        console.log('Warning: Could not initialize git repository:', e.message);
      }
    }
  }

  async commitChanges(repoPath, userName, userRole) {
    try {
      const tmpDir = repoPath || './tmp';
      let status;
      try {
        status = execSync('git status --porcelain', { cwd: tmpDir, encoding: 'utf8' });
      } catch(e) {
        return;
      }
      
      if (!status || status.trim().length === 0) {
        return;
      }

      // Добавляем все изменения в индекс
      execSync('git add -A', { cwd: tmpDir });

      // Определяем время предыдущего git-коммита,
      // чтобы собрать только действия после него.
      let lastCommitTime = null;
      try {
        const lastCommit = execSync('git log -1 --format=%cI', { cwd: tmpDir, encoding: 'utf8' }).trim();
        if (lastCommit) {
          // Переводим время последнего коммита в формат SQLite DATETIME: 'YYYY-MM-DD HH:MM:SS' (UTC),
          // чтобы корректно сравнивать с полем audit.timestamp (CURRENT_TIMESTAMP в SQLite).
          const dt = new Date(lastCommit);
          const pad = (n) => String(n).padStart(2, '0');
          const year = dt.getUTCFullYear();
          const month = pad(dt.getUTCMonth() + 1);
          const day = pad(dt.getUTCDate());
          const hours = pad(dt.getUTCHours());
          const minutes = pad(dt.getUTCMinutes());
          const seconds = pad(dt.getUTCSeconds());
          lastCommitTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }
      } catch (e) {
        // Репозиторий может быть без коммитов — тогда берём просто последние действия
        lastCommitTime = null;
      }

      // Собираем краткое описание действий ТОЛЬКО текущего пользователя
      // между предыдущим коммитом и текущим моментом.
      let actionsSummary = '';
      try {
        let query = this.db('audit')
          .whereIn('method', ['POST', 'PATCH', 'DELETE'])
          .andWhere('user', userName);

        if (lastCommitTime) {
          query = query.andWhere('timestamp', '>', lastCommitTime);
        }

        const recentActions = await query.orderBy('timestamp', 'asc');

        if (recentActions && recentActions.length > 0) {
          const pad = (n) => String(n).padStart(2, '0');

          const lines = recentActions.map(a => {
            let localTimestamp = a.timestamp;
            try {
              const dt = new Date(a.timestamp.replace(' ', 'T') + 'Z');
              if (!isNaN(dt.getTime())) {
                const year = dt.getFullYear();
                const month = pad(dt.getMonth() + 1);
                const day = pad(dt.getDate());
                const hours = pad(dt.getHours());
                const minutes = pad(dt.getMinutes());
                const seconds = pad(dt.getSeconds());
                localTimestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
              }
            } catch (e) {
            }

            let dataStr = a.data;
            return `- [${localTimestamp}] ${a.user} (${a.role}) ${a.method} ${a.action} ${dataStr || ''}`.trim();
          });
          actionsSummary = '\n\nUser actions since last sync:\n' + lines.join('\n');
        }
      } catch (e) {
        console.log('Warning: Could not load audit log for git commit message:', e.message);
      }

      const commitMessage = `Config sync by ${userName} (${userRole})${actionsSummary}`;

      // Передаём сообщение коммита напрямую в stdin git commit,
      // без использования временного файла.
      execSync('git commit -F -', { cwd: tmpDir, input: commitMessage });
      
      console.log(`Git commit created: ${commitMessage}`);
    } catch(e) {
      console.log('Warning: Could not create git commit:', e.message);
    }
  }

  async forceConfigSync(input, userInfo = null) {
    let i, file, rs, zone, zoneFile, fileContents, parser, rollout;
    const server = this.info;
    await this.loadDnsDetails();
    const ssh = await this.createConnection();

    await this.initGitRepo('./tmp');

    const serverGroup = await this.db('ns_group')
      .join('ns_group_member', 'ns_group_member.group_id', 'ns_group.ID')
      .where('ns_group_member.server_id', server.ID)
      .select('ns_group.name')
      .first();
    const groupName = serverGroup ? serverGroup.name : 'unknown';
    
    const baseDir = `./tmp/${groupName}`;
    const zonesDir = `${baseDir}/zones`;
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    if (!fs.existsSync(zonesDir)) {
        fs.mkdirSync(zonesDir, { recursive: true });
    }
    
    // Fetch and prepare zone data
    const zones = await this.getServerZones();
    const masterZones = zones.filter(zone => Boolean(zone.primary) && zone.type === 'authoritative').map( zone => {
      zone.dynamic = Boolean(this.acls.filter(acl => zone.primary && acl.user_id === zone.ID).length);
      return zone;
    } );
    // Build bind config file
    const config = new BindConfig(server.config_path.replace(/\/$/, ''));
    const local_file = `${baseDir}/server_${server.ID}.bindconf`;
    for( i = 0; i < zones.length; i++ ) {
      zones[i].ns_group_set = this.nameservers.filter(group => group.group_id === zones[i].ns_group);
      zones[i].dynamicUpdaters = this.acls.filter(acl => zones[i].primary && acl.user_id === zones[i].ID).map(acl => acl.members).join(',').split(',');
      config.addZone(zones[i]);
    }
    fs.writeFileSync(local_file, config.buildConfigFile());
    // Build zone files
    const zoneFiles = [];
    if( masterZones.length > 0 ) {
      // Get all records from all master zones
      const records = await this.db('record').whereIn('zone_id', masterZones.map(z => z.ID)).orderBy('name', 'asc');
      for( zone of masterZones ) {
        zoneFile = new BindZoneFile(zone, records.filter(r => r.zone_id === zone.ID));
        rollout = true;
        // Sync dynamic zones before zone-rollout
        if( zone.dynamic ) {
          rs = await this.syncZone(zone.fqdn, zone.view);
          if( ! rs ) console.log('Dynamic zone sync failed: ' + zone.fqdn);
        }
        // Download remote zone file
        try {
          console.log(`Downloading ${this.getConfigPath()}/${zoneFile.filename} from ${this.info.name}`);
          fileContents = await this.getRemoteFileContents(ssh, `${this.getConfigPath()}/${zoneFile.filename}`);
          parser = new BindParser();
          parser.setContent(fileContents);
          // Check serial
          if( zone.dynamic && parser.getSerial() > zone.soa_serial ) {
            rollout = false;
            throw Error(zone.fqdn + ": Dynamic zone serial is higher than expected. Freeze and sync this zone before making changes!");
          }
          rollout = parser.getSerial() < zone.soa_serial;
          console.log(`Remote serial ${parser.getSerial()}, local serial ${zone.soa_serial}, rollout=${rollout}`);
        } catch(e) {
          console.log("File download failed: " + e.toString());
        };
        // Make new zonefile
        if( rollout ) {
          zoneFile.writeTo(`${zonesDir}/${zoneFile.filename}`);
          zoneFiles.push(zoneFile);
        }
      }
    }
    
    // Создаем git коммит с локальными изменениями перед загрузкой на сервер
    if (userInfo) {
      await this.commitChanges('./tmp', userInfo.name || 'unknown', userInfo.role || 'unknown');
    } else {
      await this.commitChanges('./tmp', 'system', 'system');
    }
    
    // Push configuration to remote system
    if( ssh.isConnected() ) {
      await this.installConfigFile(ssh, local_file, `${this.getConfigPath()}/${this.configFileName}`);
      for( i = 0; i < zoneFiles.length; i++ ) {
        const tempZoneFile = `./tmp/${zoneFiles[i].filename}`;
        fs.copyFileSync(`${zonesDir}/${zoneFiles[i].filename}`, tempZoneFile);
        await this.installZoneFile(ssh, zoneFiles[i]);
        try { fs.unlinkSync(tempZoneFile); }
        catch(e) { console.log(`Failed to delete temporary zonefile ${tempZoneFile}`); }
      }
    } else {
      throw Error('Couldnt establish ssh connection to ' + server.ssh_host);
    }
    // Reload dns server
    await this.reloadServer(ssh);
    // Update config sync flag
    await this.db('server').where('ID', server.ID).update({update_required: 0, last_status: 1});
    
    return true;
  }

  getNsGroupMatrix() {
    return this.db
      .table('ns_group')
      .join('ns_group_member', 'ns_group_member.group_id', 'ns_group.ID')
      .join('server', 'server.ID', 'ns_group_member.server_id')
      .select('ns_group_member.group_id', 'ns_group_member.server_id', 'server.dns_ip', 'server.dns_fqdn', 'ns_group_member.primary', 'ns_group_member.source_id', 'ns_group_member.hidden');
  }

  async getServerZones(zoneId = null) {
    const query = this.db('zone')
      .join('ns_group_member', 'ns_group_member.group_id', 'zone.ns_group')
      .leftJoin('forwarder', 'zone.forwarder_group', 'forwarder.ID')
      .where('ns_group_member.server_id', this.info.ID)
      .orderBy('zone.fqdn', 'asc');
    if( zoneId !== null ) query.where('zone.ID', zoneId);
    const zones = await query.select('zone.*', 'ns_group_member.primary', 'ns_group_member.source_id', 'ns_group_member.hidden', 'forwarder.members as forwarders');
    return zones.map( zone => {
      zone.serverID = this.info.ID;
      zone.view = this.views.find(view => view.name === zone.view);
      zone.nameservers = this.nameservers.filter(ns => ns.group_id === zone.ns_group);
      return zone;
    } );
  }
}
