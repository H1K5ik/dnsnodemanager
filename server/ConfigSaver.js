const fs = require('fs');
const path = require('path');
const GitManager = require('./GitManager');

/**
 * Система сохранения конфигураций DNS в временную директорию
 * Сохраняет все изменения конфигураций для каждой группы серверов, ACL и forward зон
 * 
 * Структура директорий:
 * - configs/acl/ - ACL конфигурации
 * - configs/{server_name}/zones/{authority|forward}/ - зоны сервера
 * - configs/{group_name}/servers/{server_name}/zones/{authority|forward}/ - зоны сервера в группе
 */
module.exports = class ConfigSaver {
  
  constructor(db) {
    this.db = db;
    this.tmpDir = path.join(__dirname, '..', 'tmp');
    this.configDir = path.join(this.tmpDir, 'configs');
    this.gitManager = new GitManager(this.configDir);
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
    // Создаем базовые директории
    const baseDirs = ['acl'];
    baseDirs.forEach(dir => {
      const dirPath = path.join(this.configDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Создает директории для сервера
   * @param {string} serverName - имя сервера
   */
  ensureServerDirectories(serverName) {
    const serverDir = path.join(this.configDir, serverName);
    const zonesDir = path.join(serverDir, 'zones');
    const authorityDir = path.join(zonesDir, 'authority');
    const forwardDir = path.join(zonesDir, 'forward');
    
    [serverDir, zonesDir, authorityDir, forwardDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Создает директории для группы
   * @param {string} groupName - имя группы
   */
  ensureGroupDirectories(groupName) {
    const groupDir = path.join(this.configDir, groupName);
    const serversDir = path.join(groupDir, 'servers');
    
    [groupDir, serversDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Создает директории для группы серверов
   * @param {string} groupName - имя группы
   * @param {string} serverName - имя сервера
   */
  ensureGroupServerDirectories(groupName, serverName) {
    const groupDir = path.join(this.configDir, groupName);
    const serversDir = path.join(groupDir, 'servers');
    const serverDir = path.join(serversDir, serverName);
    const zonesDir = path.join(serverDir, 'zones');
    const authorityDir = path.join(zonesDir, 'authority');
    const forwardDir = path.join(zonesDir, 'forward');
    
    [groupDir, serversDir, serverDir, zonesDir, authorityDir, forwardDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Сохраняет конфигурацию ACL
   * @param {Object} aclData - данные ACL
   * @param {Object} userInfo - информация о пользователе
   */
  async saveAclConfig(aclData, userInfo = null) {
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

    const filename = `${aclData.name}_${timestamp}.json`;
    const filepath = path.join(this.configDir, 'acl', filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`ACL config saved: ${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('ACL', aclData.name, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет конфигурацию Forward Group
   * @param {Object} fwdGroupData - данные Forward Group
   * @param {Object} userInfo - информация о пользователе
   */
  async saveFwdGroupConfig(fwdGroupData, userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'forward_group',
      fwdGroup: fwdGroupData,
      metadata: {
        fwdGroupId: fwdGroupData.ID,
        fwdGroupName: fwdGroupData.name,
        memberCount: fwdGroupData.members ? fwdGroupData.members.split(',').length : 0
      }
    };

    const filename = `${fwdGroupData.name}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Forward Group config saved: ${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('Forward Group', fwdGroupData.name, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет конфигурацию NS Group
   * @param {Object} groupData - данные группы
   * @param {Array} members - участники группы
   * @param {Object} userInfo - информация о пользователе
   */
  async saveNsGroupConfig(groupData, members = [], userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Создаем директории для группы
    this.ensureGroupDirectories(groupData.name);
    
    const configData = {
      timestamp,
      type: 'ns_group',
      group: groupData,
      members: members,
      metadata: {
        groupId: groupData.ID,
        groupName: groupData.name,
        memberCount: members.length,
        primaryServer: members.find(m => m.primary)?.server_id || null
      }
    };

    const filename = `${groupData.name}_${timestamp}.json`;
    const filepath = path.join(this.configDir, groupData.name, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`NS Group config saved: ${groupData.name}/${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('NS Group', groupData.name, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет конфигурацию сервера
   * @param {Object} serverData - данные сервера
   * @param {Object} userInfo - информация о пользователе
   */
  async saveServerConfig(serverData, userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const configData = {
      timestamp,
      type: 'server',
      server: serverData,
      metadata: {
        serverId: serverData.ID,
        serverName: serverData.name,
        serverIp: serverData.dns_ip
      }
    };

    const filename = `${serverData.name}_${timestamp}.json`;
    const filepath = path.join(this.configDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Server config saved: ${filename}`);
    
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('Server', serverData.name, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет зону сервера
   * @param {Object} serverData - данные сервера
   * @param {Object} zoneData - данные зоны
   * @param {Array} records - записи зоны
   * @param {Object} userInfo - информация о пользователе
   */
  async saveServerZone(serverData, zoneData, records = [], userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zoneType = zoneData.type === 'forward' ? 'forward' : 'authority';
    
    // Создаем директории для сервера
    this.ensureServerDirectories(serverData.name);
    
    const configData = {
      timestamp,
      type: 'server_zone',
      server: serverData,
      zone: zoneData,
      records: records,
      metadata: {
        serverId: serverData.ID,
        serverName: serverData.name,
        zoneId: zoneData.ID,
        zoneName: zoneData.fqdn,
        zoneType: zoneData.type,
        recordCount: records.length
      }
    };

    const filename = `${zoneData.fqdn}_${timestamp}.json`;
    const filepath = path.join(this.configDir, serverData.name, 'zones', zoneType, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Server zone saved: ${serverData.name}/zones/${zoneType}/${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('Server Zone', `${serverData.name}: ${zoneData.fqdn} (${zoneType})`, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет зону сервера в группе
   * @param {Object} groupData - данные группы
   * @param {Object} serverData - данные сервера
   * @param {Object} zoneData - данные зоны
   * @param {Array} records - записи зоны
   * @param {Object} userInfo - информация о пользователе
   */
  async saveGroupServerZone(groupData, serverData, zoneData, records = [], userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zoneType = zoneData.type === 'forward' ? 'forward' : 'authority';
    
    // Создаем директории для группы и сервера
    this.ensureGroupServerDirectories(groupData.name, serverData.name);
    
    const configData = {
      timestamp,
      type: 'group_server_zone',
      group: groupData,
      server: serverData,
      zone: zoneData,
      records: records,
      metadata: {
        groupId: groupData.ID,
        groupName: groupData.name,
        serverId: serverData.ID,
        serverName: serverData.name,
        zoneId: zoneData.ID,
        zoneName: zoneData.fqdn,
        zoneType: zoneData.type,
        recordCount: records.length
      }
    };

    const filename = `${zoneData.fqdn}_${timestamp}.json`;
    const filepath = path.join(this.configDir, groupData.name, 'servers', serverData.name, 'zones', zoneType, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Group server zone saved: ${groupData.name}/servers/${serverData.name}/zones/${zoneType}/${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('Group Server Zone', `${groupData.name}: ${serverData.name} - ${zoneData.fqdn} (${zoneType})`, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Сохраняет полную конфигурацию сервера с зонами
   * @param {Object} serverData - данные сервера
   * @param {Array} zones - зоны сервера
   * @param {string} bindConfig - bind конфигурация
   * @param {Object} userInfo - информация о пользователе
   */
  async saveServerFullConfig(serverData, zones, bindConfig, userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Создаем директории для сервера
    this.ensureServerDirectories(serverData.name);
    
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

    const filename = `full_config_${timestamp}.json`;
    const filepath = path.join(this.configDir, serverData.name, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Server full config saved: ${serverData.name}/${filename}`);
    
    // Также сохраняем bind конфигурацию как отдельный файл
    const bindFilename = `bind_config_${timestamp}.conf`;
    const bindFilepath = path.join(this.configDir, serverData.name, bindFilename);
    fs.writeFileSync(bindFilepath, bindConfig);
    
    // Создаем Git коммит с информацией о пользователе
    const relativeConfigPath = path.relative(this.configDir, filepath);
    const relativeBindPath = path.relative(this.configDir, bindFilepath);
    const commitMessage = this.formatCommitMessage('Server Full Config', `${serverData.name}: Full configuration sync`, userInfo);
    await this.gitCommit(commitMessage, [relativeConfigPath, relativeBindPath]);
    
    return { configFile: filepath, bindFile: bindFilepath };
  }

  /**
   * Переносит конфигурации сервера в структуру группы
   * @param {string} serverName - имя сервера
   * @param {string} groupName - имя группы
   * @param {Object} userInfo - информация о пользователе
   */
  async moveServerToGroup(serverName, groupName, userInfo = null) {
    const serverDir = path.join(this.configDir, serverName);
    const groupServerDir = path.join(this.configDir, groupName, 'servers', serverName);
    
    if (!fs.existsSync(serverDir)) {
      console.log(`Сервер ${serverName} не имеет конфигураций для переноса`);
      return;
    }
    
    // Создаем директории в группе
    this.ensureGroupServerDirectories(groupName, serverName);
    
    try {
      // Копируем все файлы из директории сервера в группу
      const copyDir = (src, dest) => {
        if (!fs.existsSync(src)) return;
        
        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          const stat = fs.statSync(srcPath);
          
          if (stat.isDirectory()) {
            if (!fs.existsSync(destPath)) {
              fs.mkdirSync(destPath, { recursive: true });
            }
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      
      copyDir(serverDir, groupServerDir);
      
      console.log(`Конфигурации сервера ${serverName} перенесены в группу ${groupName}`);
      
      // Создаем Git коммит для переноса
      const relativePath = path.relative(this.configDir, groupServerDir);
      const commitMessage = this.formatCommitMessage('Server Move', `${serverName} moved to group ${groupName}`, userInfo);
      await this.gitCommit(commitMessage, [relativePath]);
      
    } catch (error) {
      console.error(`Ошибка при переносе сервера ${serverName} в группу ${groupName}:`, error);
    }
  }

  /**
   * Сохраняет зону, которая была сохранена на сервере
   * @param {Object} serverData - данные сервера
   * @param {Object} zoneData - данные зоны
   * @param {Array} records - записи зоны
   * @param {Object} userInfo - информация о пользователе
   */
  async saveZoneToServer(serverData, zoneData, records = [], userInfo = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zoneType = zoneData.type === 'forward' ? 'forward' : 'authority';
    
    const configData = {
      timestamp,
      type: 'zone_saved_to_server',
      server: serverData,
      zone: zoneData,
      records: records,
      metadata: {
        serverId: serverData.ID,
        serverName: serverData.name,
        zoneId: zoneData.ID,
        zoneName: zoneData.fqdn,
        zoneType: zoneData.type,
        recordCount: records.length,
        savedToPath: `${serverData.config_path}/zones/${zoneType}/${zoneData.fqdn}.zone`
      }
    };

    const filename = `${zoneData.fqdn}_${timestamp}.json`;
    const filepath = path.join(this.configDir, serverData.name, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(configData, null, 2));
    console.log(`Zone saved to server config saved: ${serverData.name}/${filename}`);
    
    // Создаем Git коммит с информацией о пользователе
    const relativePath = path.relative(this.configDir, filepath);
    const commitMessage = this.formatCommitMessage('Zone Saved to Server', `${serverData.name}: ${zoneData.fqdn} (${zoneType})`, userInfo);
    await this.gitCommit(commitMessage, [relativePath]);
    
    return filepath;
  }

  /**
   * Получает все сохраненные конфигурации определенного типа
   * @param {string} type - тип конфигурации (acl, server_zone, group_server_zone, server_full_config)
   * @returns {Array} - массив путей к файлам конфигураций
   */
  getConfigsByType(type) {
    if (!fs.existsSync(this.configDir)) {
      return [];
    }

    const files = [];
    
    if (type === 'acl') {
      const aclDir = path.join(this.configDir, 'acl');
      if (fs.existsSync(aclDir)) {
        const aclFiles = fs.readdirSync(aclDir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.join(aclDir, file));
        files.push(...aclFiles);
      }
    } else {
      // Рекурсивный поиск для других типов
      this.findConfigFiles(this.configDir, type, files);
    }

    return files.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime - statA.mtime; // Сортировка по времени изменения (новые первыми)
    });
  }

  /**
   * Рекурсивно ищет файлы конфигураций определенного типа
   * @param {string} dir - директория для поиска
   * @param {string} type - тип конфигурации
   * @param {Array} files - массив для сохранения найденных файлов
   */
  findConfigFiles(dir, type, files) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // Пропускаем директории acl, так как они обрабатываются отдельно
        if (path.basename(dir) !== 'acl') {
          this.findConfigFiles(itemPath, type, files);
        }
      } else if (stat.isFile() && item.endsWith('.json')) {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          const configData = JSON.parse(content);
          if (configData.type === type) {
            files.push(itemPath);
          }
        } catch (error) {
          // Игнорируем файлы с ошибками парсинга
          console.warn(`Warning: Could not parse config file ${itemPath}:`, error.message);
        }
      }
    }
  }

  /**
   * Получает последнюю конфигурацию определенного типа и ID
   * @param {string} type - тип конфигурации
   * @param {number} id - ID объекта
   * @returns {Object|null} - последняя конфигурация или null
   */
  getLatestConfig(type, id) {
    const configs = this.getConfigsByType(type);
    
    for (const configPath of configs) {
      try {
        const content = fs.readFileSync(configPath, 'utf8');
        const configData = JSON.parse(content);
        
        // Проверяем ID в зависимости от типа
        if (type === 'acl' && configData.acl && configData.acl.ID === id) {
          return configData;
        } else if (type === 'server_full_config' && configData.server && configData.server.ID === id) {
          return configData;
        } else if (type === 'server_zone' && configData.zone && configData.zone.ID === id) {
          return configData;
        } else if (type === 'group_server_zone' && configData.zone && configData.zone.ID === id) {
          return configData;
        }
      } catch (error) {
        console.warn(`Warning: Could not parse config file ${configPath}:`, error.message);
      }
    }
    
    return null;
  }

  /**
   * Очищает старые конфигурации (оставляет только последние N версий)
   * @param {number} keepVersions - количество версий для сохранения (по умолчанию 10)
   */
  cleanupOldConfigs(keepVersions = 10) {
    if (!fs.existsSync(this.configDir)) {
      return;
    }

    // Очищаем ACL конфигурации
    const aclDir = path.join(this.configDir, 'acl');
    if (fs.existsSync(aclDir)) {
      this.cleanupDirectory(aclDir, keepVersions);
    }

    // Очищаем серверные конфигурации
    this.cleanupServerConfigs(keepVersions);
  }

  /**
   * Очищает конфигурации серверов
   * @param {number} keepVersions - количество версий для сохранения
   */
  cleanupServerConfigs(keepVersions) {
    const items = fs.readdirSync(this.configDir);
    
    for (const item of items) {
      const itemPath = path.join(this.configDir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item !== 'acl') {
        // Это директория сервера или группы
        this.cleanupDirectory(itemPath, keepVersions);
        
        // Рекурсивно очищаем поддиректории
        this.cleanupSubdirectories(itemPath, keepVersions);
      }
    }
  }

  /**
   * Очищает поддиректории
   * @param {string} dir - директория
   * @param {number} keepVersions - количество версий для сохранения
   */
  cleanupSubdirectories(dir, keepVersions) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.cleanupDirectory(itemPath, keepVersions);
        this.cleanupSubdirectories(itemPath, keepVersions);
      }
    }
  }

  /**
   * Очищает директорию от старых файлов
   * @param {string} dir - директория
   * @param {number} keepVersions - количество версий для сохранения
   */
  cleanupDirectory(dir, keepVersions) {
    const files = fs.readdirSync(dir)
      .filter(file => file.endsWith('.json') || file.endsWith('.conf'))
      .map(file => ({
        name: file,
        path: path.join(dir, file),
        mtime: fs.statSync(path.join(dir, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Сортировка по времени изменения (новые первыми)

    // Группируем файлы по префиксу (до первого подчеркивания)
    const fileGroups = {};
    files.forEach(file => {
      const prefix = file.name.split('_')[0];
      if (!fileGroups[prefix]) {
        fileGroups[prefix] = [];
      }
      fileGroups[prefix].push(file);
    });

    // Удаляем старые версии в каждой группе
    Object.values(fileGroups).forEach(group => {
      group.slice(keepVersions).forEach(file => {
        try {
          fs.unlinkSync(file.path);
          console.log(`Deleted old config: ${file.name}`);
        } catch (error) {
          console.error(`Error deleting config file ${file.path}:`, error);
        }
      });
    });
  }

  /**
   * Получает статистику сохраненных конфигураций
   * @returns {Object} - статистика конфигураций
   */
  getConfigStats() {
    if (!fs.existsSync(this.configDir)) {
      return { totalFiles: 0, byType: {}, totalSize: 0, byDirectory: {} };
    }

    const stats = {
      totalFiles: 0,
      byType: {},
      totalSize: 0,
      byDirectory: {}
    };

    this.collectStats(this.configDir, stats);
    return stats;
  }

  /**
   * Собирает статистику рекурсивно
   * @param {string} dir - директория
   * @param {Object} stats - объект статистики
   */
  collectStats(dir, stats) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.collectStats(itemPath, stats);
      } else if (stat.isFile() && (item.endsWith('.json') || item.endsWith('.conf'))) {
        stats.totalFiles++;
        stats.totalSize += stat.size;
        
        // Определяем тип по расширению
        const type = item.endsWith('.json') ? 'json' : 'conf';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        
        // Статистика по директориям
        const relativePath = path.relative(this.configDir, dir);
        stats.byDirectory[relativePath] = (stats.byDirectory[relativePath] || 0) + 1;
        
        // Для JSON файлов определяем тип конфигурации
        if (item.endsWith('.json')) {
          try {
            const content = fs.readFileSync(itemPath, 'utf8');
            const configData = JSON.parse(content);
            const configType = configData.type || 'unknown';
            stats.byType[configType] = (stats.byType[configType] || 0) + 1;
          } catch (error) {
            // Игнорируем ошибки парсинга
          }
        }
      }
    }
  }

  /**
   * Форматирует сообщение коммита с информацией о пользователе
   * @param {string} type - тип изменения
   * @param {string} details - детали изменения
   * @param {Object} userInfo - информация о пользователе
   * @returns {string} - отформатированное сообщение
   */
  formatCommitMessage(type, details, userInfo = null) {
    let message = `${type}: ${details}`;
    
    if (userInfo && userInfo.username) {
      message += ` (by ${userInfo.username})`;
    }
    
    return message;
  }

  /**
   * Создает Git коммит
   * @param {string} message - сообщение коммита
   * @param {Array} files - файлы для коммита
   */
  async gitCommit(message, files = null) {
    try {
      return await this.gitManager.commit(message, files);
    } catch (error) {
      console.error('Ошибка Git коммита:', error);
      // Не прерываем выполнение, если Git недоступен
      return null;
    }
  }

  /**
   * Получает историю Git коммитов
   * @param {number} limit - количество коммитов
   */
  async getGitHistory(limit = 10) {
    try {
      return await this.gitManager.getHistory(limit);
    } catch (error) {
      console.error('Ошибка получения Git истории:', error);
      return [];
    }
  }

  /**
   * Получает детали Git коммита
   * @param {string} hash - хеш коммита
   */
  getGitCommitDetails(hash) {
    try {
      return this.gitManager.getCommitDetails(hash);
    } catch (error) {
      console.error('Ошибка получения деталей Git коммита:', error);
      return null;
    }
  }

  /**
   * Откатывается к определенному Git коммиту
   * @param {string} hash - хеш коммита
   * @param {boolean} hard - жесткий откат
   */
  async revertToGitCommit(hash, hard = false) {
    try {
      return await this.gitManager.revertToCommit(hash, hard);
    } catch (error) {
      console.error('Ошибка отката к Git коммиту:', error);
      throw error;
    }
  }

  /**
   * Создает Git ветку
   * @param {string} branchName - имя ветки
   */
  async createGitBranch(branchName) {
    try {
      return await this.gitManager.createBranch(branchName);
    } catch (error) {
      console.error('Ошибка создания Git ветки:', error);
      throw error;
    }
  }

  /**
   * Переключается на Git ветку
   * @param {string} branchName - имя ветки
   */
  async switchGitBranch(branchName) {
    try {
      return await this.gitManager.switchBranch(branchName);
    } catch (error) {
      console.error('Ошибка переключения Git ветки:', error);
      throw error;
    }
  }

  /**
   * Получает список Git веток
   */
  getGitBranches() {
    try {
      return this.gitManager.getBranches();
    } catch (error) {
      console.error('Ошибка получения Git веток:', error);
      return [];
    }
  }

  /**
   * Получает статистику Git репозитория
   */
  async getGitStats() {
    try {
      return await this.gitManager.getStats();
    } catch (error) {
      console.error('Ошибка получения Git статистики:', error);
      return {
        totalCommits: 0,
        branches: 0,
        currentBranch: 'master',
        lastCommit: null
      };
    }
  }

  /**
   * Создает Git тег
   * @param {string} tagName - имя тега
   * @param {string} message - сообщение тега
   */
  async createGitTag(tagName, message = '') {
    try {
      return await this.gitManager.createTag(tagName, message);
    } catch (error) {
      console.error('Ошибка создания Git тега:', error);
      throw error;
    }
  }

  /**
   * Получает список Git тегов
   */
  getGitTags() {
    try {
      return this.gitManager.getTags();
    } catch (error) {
      console.error('Ошибка получения Git тегов:', error);
      return [];
    }
  }

  /**
   * Получает расширенную статистику конфигураций с Git информацией
   */
  async getExtendedStats() {
    const configStats = this.getConfigStats();
    const gitStats = await this.getGitStats();
    const gitHistory = await this.getGitHistory(5);
    
    return {
      ...configStats,
      git: {
        ...gitStats,
        recentCommits: gitHistory
      }
    };
  }
}