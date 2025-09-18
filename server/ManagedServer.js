const fs = require("fs");
const path = require("path");
const NodeSSH = require('node-ssh').NodeSSH;
const BindConfig = require('./BindConfig');
const BindParser = require('./BindParser');
const BindZoneFile = require('./BindZoneFile');
const ConfigSaver = require('./ConfigSaver');

module.exports = class ManagedServer {
  constructor(db) {
    this.configFileName = 'managedconfig.conf';
    this.db = db;
    this.configSaver = new ConfigSaver(db);
    this.info = null;
    this.serviceGroup = null;
    this.acls = [];
    this.views = [];
    this.nameservers = [];
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
    const remoteFile = `${this.getConfigPath()}/zones/${zoneFile.filename}`;
    
    // Создаем папку zones если она не существует
    await ssh.execCommand(`mkdir -p ${this.getConfigPath()}/zones`);
    
    await ssh.putFile(`./tmp/${zoneFile.filename}`, remoteFile);
    await ssh.execCommand(`chgrp ${await this.getServiceGroup(ssh)} ${remoteFile}`);
    await ssh.execCommand(`chmod 664 ${remoteFile}`);

    console.log(`Uploaded ${this.getConfigPath()}/zones/${zoneFile.filename}`);

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

  async deleteZoneFiles(ssh, zones) {
    const deletedFiles = [];
    const errors = [];
    
    for (const zone of zones) {
      try {
        const zoneFileName = `${zone.fqdn}.${zone.view || 'default'}.db`;
        const remoteFile = `${this.getConfigPath()}/zones/${zoneFileName}`;
        
        const checkFile = await ssh.execCommand(`test -f ${remoteFile} && echo "exists" || echo "not_found"`);
        
        if (checkFile.stdout.trim() === 'exists') {
          const deleteResult = await ssh.execCommand(`rm -f ${remoteFile}`);
          
          if (deleteResult.code === 0) {
            deletedFiles.push(zoneFileName);
            console.log(`Successfully deleted zone file: ${remoteFile}`);
          } else {
            errors.push(`Failed to delete ${zoneFileName}: ${deleteResult.stderr}`);
            console.error(`Failed to delete zone file ${remoteFile}:`, deleteResult.stderr);
          }
        } else {
          console.log(`Zone file ${remoteFile} not found, skipping deletion`);
        }
      } catch (error) {
        errors.push(`Error processing zone ${zone.fqdn}: ${error.message}`);
        console.error(`Error deleting zone file for ${zone.fqdn}:`, error);
      }
    }
    
    return {
      deletedFiles,
      errors,
      success: errors.length === 0
    };
  }

  /**
   * Сохраняет зону сразу на DNS сервер
   * @param {Object} zoneData - данные зоны
   * @param {Array} records - записи зоны
   * @param {Object} userInfo - информация о пользователе
   */
  async saveZoneToServer(zoneData, records = [], userInfo = null) {
    const server = this.info;
    await this.loadDnsDetails();
    const ssh = await this.createConnection();

    const zoneType = zoneData.type === 'forward' ? 'forward' : 'authority';
    const remoteZonePath = path.join(server.config_path, 'zones', zoneType, `${zoneData.fqdn}.zone`);
    
    let zoneContent = '';
    
    if (zoneData.type === 'authoritative') {
      // Создаем zone файл для authoritative зоны
      const zoneFile = new BindZoneFile(zoneData, records);
      zoneContent = zoneFile.buildZoneFile();
    } else {
      // Создаем конфигурацию для forward зоны
      zoneContent = this.buildForwardZoneConfig(zoneData);
    }

    // Создаем временный файл
    const tmpFile = `./tmp/zone_${zoneData.ID}_${Date.now()}.zone`;
    fs.writeFileSync(tmpFile, zoneContent);

    try {
      // Загружаем файл на сервер
      await ssh.putFile(tmpFile, remoteZonePath);
      console.log(`Zone ${zoneData.fqdn} saved to server ${server.name} at ${remoteZonePath}`);
      
      // Обновляем конфигурацию bind
      await this.updateBindConfig(ssh, zoneData);
      
      // Перезагружаем DNS сервер
      await this.reloadServer(ssh);
      
      // Сохраняем в локальные конфигурации
      await this.configSaver.saveZoneToServer(server, zoneData, records, userInfo);
      
    } finally {
      // Удаляем временный файл
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }

  /**
   * Создает конфигурацию для forward зоны
   * @param {Object} zoneData - данные зоны
   */
  buildForwardZoneConfig(zoneData) {
    return `zone "${zoneData.fqdn}" {
    type forward;
    forwarders { ${zoneData.forwarders || '8.8.8.8; 8.8.4.4;'}; };
};
`;
  }

  /**
   * Обновляет конфигурацию bind для новой зоны
   * @param {Object} ssh - SSH соединение
   * @param {Object} zoneData - данные зоны
   */
  async updateBindConfig(ssh, zoneData) {
    const server = this.info;
    const bindConfigPath = path.join(server.config_path, 'managedconfig.conf');
    const zoneType = zoneData.type === 'forward' ? 'forward' : 'authority';
    const zonePath = `zones/${zoneType}/${zoneData.fqdn}.zone`;
    
    const zoneConfig = `
zone "${zoneData.fqdn}" {
    type ${zoneData.type === 'authoritative' ? 'master' : 'forward'};
    file "${zonePath}";
    ${zoneData.type === 'forward' ? `forwarders { ${zoneData.forwarders || '8.8.8.8; 8.8.4.4;'}; };` : ''}
};
`;

    try {
      // Скачиваем текущий конфиг
      const currentConfig = await ssh.getFile(bindConfigPath);
      
      // Проверяем, есть ли уже эта зона в конфиге
      if (!currentConfig.includes(`zone "${zoneData.fqdn}"`)) {
        // Добавляем зону в конфиг
        const updatedConfig = currentConfig + zoneConfig;
        
        // Создаем временный файл с обновленным конфигом
        const tmpConfigFile = `./tmp/config_${Date.now()}.conf`;
        fs.writeFileSync(tmpConfigFile, updatedConfig);
        
        // Загружаем обновленный конфиг на сервер
        await ssh.putFile(tmpConfigFile, bindConfigPath);
        
        // Удаляем временный файл
        fs.unlinkSync(tmpConfigFile);
        
        console.log(`Bind config updated for zone ${zoneData.fqdn}`);
      }
    } catch (error) {
      console.error(`Error updating bind config for zone ${zoneData.fqdn}:`, error);
    }
  }

  async forceConfigSync(input) {
    let i, file, rs, zone, zoneFile, fileContents, parser, rollout;
    const server = this.info;
    await this.loadDnsDetails();
    const ssh = await this.createConnection();

    const tmpDir = './tmp';
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const zones = await this.getServerZones();
    const masterZones = zones.filter(zone => Boolean(zone.primary) && zone.type === 'authoritative').map( zone => {
      zone.dynamic = Boolean(this.acls.filter(acl => zone.primary && acl.user_id === zone.ID).length);
      return zone;
    } );
    // Build bind config file
    const config = new BindConfig(server.config_path.replace(/\/$/, ''));
    const local_file = `./tmp/server_${server.ID}.bindconf`;
    for( i = 0; i < zones.length; i++ ) {
      zones[i].ns_group_set = this.nameservers.filter(group => group.group_id === zones[i].ns_group);
      zones[i].dynamicUpdaters = this.acls.filter(acl => zones[i].primary && acl.user_id === zones[i].ID).map(acl => acl.members).join(',').split(',');
      config.addZone(zones[i]);
    }
    const bindConfigContent = config.buildConfigFile();
    fs.writeFileSync(local_file, bindConfigContent);
    
    await this.configSaver.saveServerFullConfig(server, zones, bindConfigContent, { username: 'system' });
    
    // Сохраняем каждую зону отдельно для сервера
    for (const zone of zones) {
      const records = zone.type === 'authoritative' && zone.primary ? 
        await this.db('record').where('zone_id', zone.ID).orderBy('name', 'asc') : [];
      await this.configSaver.saveServerZone(server, zone, records, { username: 'system' });
    }
    
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
          console.log(`Downloading ${this.getConfigPath()}/zones/${zoneFile.filename} from ${this.info.name}`);
          fileContents = await this.getRemoteFileContents(ssh, `${this.getConfigPath()}/zones/${zoneFile.filename}`);
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
          zoneFile.writeTo(`./tmp/${zoneFile.filename}`);
          zoneFiles.push(zoneFile);
        }
      }
    }
    // Push configuration to remote system
    if( ssh.isConnected() ) {
      // Создаем папку zones на сервере
      await ssh.execCommand(`mkdir -p ${this.getConfigPath()}/zones`);
      
      await this.installConfigFile(ssh, local_file, `${this.getConfigPath()}/${this.configFileName}`);
      for( i = 0; i < zoneFiles.length; i++ ) {
        await this.installZoneFile(ssh, zoneFiles[i]);
        const tmpFilePath = `./tmp/${zoneFiles[i].filename}`;
        try { 
          if (fs.existsSync(tmpFilePath)) {
            fs.unlinkSync(tmpFilePath);
          }
        }
        catch(e) { console.log(`Failed to delete temporary zonefile ${tmpFilePath}: ${e.message}`); }
      }
    } else {
      throw Error('Couldnt establish ssh connection to ' + server.ssh_host);
    }
    
    // Clean up temporary config file
    try {
      if (fs.existsSync(local_file)) {
        fs.unlinkSync(local_file);
      }
    } catch(e) {
      console.log(`Failed to delete temporary config file ${local_file}: ${e.message}`);
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