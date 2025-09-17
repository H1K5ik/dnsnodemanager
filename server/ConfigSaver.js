const fs = require('fs');
const path = require('path');

/**
 * Система сохранения конфигураций DNS в временную директорию
 * Сохраняет все изменения конфигураций для каждой группы серверов, ACL и forward зон
 */
module.exports = class ConfigSaver {
  
  constructor(db) {
    this.db = db;
    this.tmpDir = './tmp';
    this.configDir = path.join(this.tmpDir, 'configs');
    this.ensureDirectories();
  }

  /**
   * Создает необходимые директории для сохранения конфигураций
   */
  ensureDirectories() {
    if (!fs.existsSync(this.tmpDir)) {
      fs.mkdirSync(this.tmpDir, { recursive: true });
    }
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Сохраняет конфигурацию группы серверов
   * @param {Object} groupData - данные группы серверов
   * @param {Array} servers - список серверов в группе
   */
  async saveNsGroupConfig(groupData, servers = []) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'ns_group',
      group: groupData,
      servers: servers,
      metadata: {
        groupId: groupData.ID,
        groupName: groupData.name,
        serverCount: servers.length
      }
    };

    const filename = `ns_group_${groupData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`NS Group config saved: ${filename}`);
    
    return filepath;
  }

  /**
   * Сохраняет конфигурацию ACL
   * @param {Object} aclData - данные ACL
   */
  async saveAclConfig(aclData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'acl',
      acl: aclData,
      metadata: {
        aclId: aclData.ID,
        aclName: aclData.name,
        memberCount: aclData.members ? aclData.members.split(',').length : 0
      }
    };

    const filename = `acl_${aclData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`ACL config saved: ${filename}`);
    
    return filepath;
  }

  async saveFwdGroupConfig(fwdGroupData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'forward_group',
      forwardGroup: fwdGroupData,
      metadata: {
        groupId: fwdGroupData.ID,
        groupName: fwdGroupData.name,
        memberCount: fwdGroupData.members ? fwdGroupData.members.split(',').length : 0
      }
    };

    const filename = `forward_group_${fwdGroupData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Forward Group config saved: ${filename}`);
    
    return filepath;
  }

  /**
   * Сохраняет конфигурацию сервера
   * @param {Object} serverData - данные сервера
   */
  async saveServerConfig(serverData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'server',
      server: serverData,
      metadata: {
        serverId: serverData.ID,
        serverName: serverData.name,
        dnsIp: serverData.dns_ip,
        managed: serverData.managed
      }
    };

    const filename = `server_${serverData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Server config saved: ${filename}`);
    
    return filepath;
  }

  /**
   * Сохраняет полную конфигурацию сервера с зонами
   * @param {Object} serverData - данные сервера
   * @param {Array} zones - зоны сервера
   * @param {Array} bindConfig - bind конфигурация
   */
  async saveServerFullConfig(serverData, zones, bindConfig) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'server_full_config',
      server: serverData,
      zones: zones,
      bindConfig: bindConfig,
      metadata: {
        serverId: serverData.ID,
        serverName: serverData.name,
        zoneCount: zones.length,
        masterZones: zones.filter(z => z.primary && z.type === 'authoritative').length,
        slaveZones: zones.filter(z => !z.primary && z.type === 'authoritative').length,
        forwardZones: zones.filter(z => z.type === 'forward').length
      }
    };

    const filename = `server_full_${serverData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Server full config saved: ${filename}`);
    
    // Также сохраняем bind конфигурацию как отдельный файл
    const bindFilename = `server_${serverData.ID}_bind_${timestamp}.conf`;
    const bindFilepath = path.join(this.configDir, bindFilename);
    fs.writeFileSync(bindFilepath, bindConfig);
    
    return { configFile: filepath, bindFile: bindFilepath };
  }

  async saveZoneConfig(zoneData, records = []) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'zone',
      zone: zoneData,
      records: records,
      metadata: {
        zoneId: zoneData.ID,
        zoneName: zoneData.fqdn,
        zoneType: zoneData.type,
        recordCount: records.length,
        nsGroup: zoneData.ns_group
      }
    };

    const filename = `zone_${zoneData.ID}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Zone config saved: ${filename}`);
    
    return filepath;
  }

  getConfigsByType(type) {
    if (!fs.existsSync(this.configDir)) {
      return [];
    }

    const files = fs.readdirSync(this.configDir);
    return files
      .filter(file => file.startsWith(type + '_') && file.endsWith('.json'))
      .map(file => path.join(this.configDir, file))
      .sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime - statA.mtime;
      });
  }


  getLatestConfig(type, id) {
    const configs = this.getConfigsByType(type);
    const targetConfig = configs.find(file => {
      const filename = path.basename(file);
      return filename.includes(`${type}_${id}_`);
    });

    if (!targetConfig) {
      return null;
    }

    try {
      const content = fs.readFileSync(targetConfig, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading config file ${targetConfig}:`, error);
      return null;
    }
  }

  cleanupOldConfigs(keepVersions = 10) {
    if (!fs.existsSync(this.configDir)) {
      return;
    }

    const files = fs.readdirSync(this.configDir);
    const configGroups = {};

    files.forEach(file => {
      const match = file.match(/^(\w+)_(\d+)_(.+)\.json$/);
      if (match) {
        const [, type, id] = match;
        const key = `${type}_${id}`;
        if (!configGroups[key]) {
          configGroups[key] = [];
        }
        configGroups[key].push(file);
      }
    });

    Object.values(configGroups).forEach(groupFiles => {
      groupFiles
        .sort((a, b) => {
          const statA = fs.statSync(path.join(this.configDir, a));
          const statB = fs.statSync(path.join(this.configDir, b));
          return statB.mtime - statA.mtime;
        })
        .slice(keepVersions)
        .forEach(file => {
          const filepath = path.join(this.configDir, file);
          try {
            fs.unlinkSync(filepath);
            console.log(`Deleted old config: ${file}`);
          } catch (error) {
            console.error(`Error deleting config file ${filepath}:`, error);
          }
        });
    });
  }

  getConfigStats() {
    if (!fs.existsSync(this.configDir)) {
      return { totalFiles: 0, byType: {}, totalSize: 0 };
    }

    const files = fs.readdirSync(this.configDir);
    const stats = {
      totalFiles: files.length,
      byType: {},
      totalSize: 0
    };

    files.forEach(file => {
      const match = file.match(/^(\w+)_(\d+)_(.+)\.json$/);
      if (match) {
        const type = match[1];
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        
        const filepath = path.join(this.configDir, file);
        const stat = fs.statSync(filepath);
        stats.totalSize += stat.size;
      }
    });

    return stats;
  }
}
