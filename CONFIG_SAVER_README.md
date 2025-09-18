# Система сохранения конфигураций DNS с Git интеграцией

## Обзор

Система сохранения конфигураций автоматически сохраняет все изменения в DNS конфигурациях в директорию `./tmp/configs/` с временными метками и интегрирована с Git для полного отслеживания истории изменений. Каждое изменение автоматически коммитится в Git репозиторий.

## Компоненты системы

### 1. ConfigSaver (`server/ConfigSaver.js`)

Основной класс для сохранения конфигураций. Автоматически создает директории `./tmp/configs/` и сохраняет все изменения.

**Методы:**
- `saveAclConfig(aclData)` - сохранение ACL с Git коммитом
- `saveServerZone(serverData, zoneData, records)` - сохранение зоны сервера с Git коммитом
- `saveGroupServerZone(groupData, serverData, zoneData, records)` - сохранение зоны сервера в группе с Git коммитом
- `saveServerFullConfig(serverData, zones, bindConfig)` - полная конфигурация сервера с Git коммитом
- `getConfigsByType(type)` - получение конфигураций по типу
- `getLatestConfig(type, id)` - получение последней конфигурации
- `cleanupOldConfigs(keepVersions)` - очистка старых версий
- `getConfigStats()` - статистика сохраненных конфигураций
- `getExtendedStats()` - расширенная статистика с Git информацией

**Git методы:**
- `getGitHistory(limit)` - получение истории Git коммитов
- `getGitCommitDetails(hash)` - детали конкретного коммита
- `getGitBranches()` - список веток
- `getGitStats()` - статистика Git репозитория
- `revertToGitCommit(hash, hard)` - откат к коммиту
- `createGitBranch(branchName)` - создание ветки
- `switchGitBranch(branchName)` - переключение ветки
- `createGitTag(tagName, message)` - создание тега
- `getGitTags()` - список тегов

### 2. GitManager (`server/GitManager.js`)

Класс для управления Git репозиторием конфигураций. Автоматически инициализирует Git репозиторий и создает коммиты при каждом изменении конфигурации.

**Основные возможности:**
- Автоматическая инициализация Git репозитория
- Создание коммитов с описательными сообщениями
- Управление ветками и тегами
- Получение истории изменений
- Откат к предыдущим версиям
- Статистика репозитория

### 3. Интеграция с провайдерами

Система интегрирована со всеми основными провайдерами:

- **NsGroupProvider** - сохранение при создании/обновлении групп серверов
- **AclProvider** - сохранение при создании/обновлении ACL
- **FwdGroupProvider** - сохранение при создании/обновлении forward групп
- **ServerProvider** - сохранение при создании/обновлении серверов
- **ZoneProvider** - сохранение при создании зон
- **ManagedServer** - сохранение полных конфигураций серверов при синхронизации

## Структура файлов

Файлы сохраняются в иерархической структуре директорий с временными метками:

```
./tmp/configs/
├── acl/                                    # ACL конфигурации
│   └── {acl_name}_{timestamp}.json
├── {server_name}/                          # Конфигурации сервера
│   ├── full_config_{timestamp}.json        # Полная конфигурация
│   ├── bind_config_{timestamp}.conf        # Bind конфигурация
│   └── zones/                              # Зоны сервера
│       ├── authority/                      # Авторитетные зоны
│       │   └── {zone_name}_{timestamp}.json
│       └── forward/                        # Forward зоны
│           └── {zone_name}_{timestamp}.json
└── {group_name}/                           # Конфигурации группы
    └── servers/                            # Серверы в группе
        └── {server_name}/                  # Конкретный сервер
            └── zones/                      # Зоны сервера в группе
                ├── authority/              # Авторитетные зоны
                │   └── {zone_name}_{timestamp}.json
                └── forward/                # Forward зоны
                    └── {zone_name}_{timestamp}.json
```

### Формат имен файлов

- `{name}_{timestamp}.json` - конфигурации в JSON
- `{name}_{timestamp}.conf` - bind конфигурации

## Структура данных конфигураций

### NS Group
```json
{
  "timestamp": "2025-09-17T08-06-52-009Z",
  "type": "ns_group",
  "group": {
    "ID": 1,
    "name": "test-group"
  },
  "servers": [
    {
      "ID": 1,
      "name": "server1",
      "dns_ip": "192.168.1.10"
    }
  ],
  "metadata": {
    "groupId": 1,
    "groupName": "test-group",
    "serverCount": 2
  }
}
```

### ACL
```json
{
  "timestamp": "2025-09-17T08-06-52-010Z",
  "type": "acl",
  "acl": {
    "ID": 1,
    "name": "test-acl",
    "members": "192.168.1.0/24; 10.0.0.0/8"
  },
  "metadata": {
    "aclId": 1,
    "aclName": "test-acl",
    "memberCount": 2
  }
}
```

### Server Full Config
```json
{
  "timestamp": "2025-09-17T08-06-52-010Z",
  "type": "server_full_config",
  "server": { /* данные сервера */ },
  "zones": [ /* зоны сервера */ ],
  "bindConfig": "/* содержимое bind конфигурации */",
  "metadata": {
    "serverId": 1,
    "serverName": "test-server",
    "zoneCount": 5,
    "masterZones": 3,
    "slaveZones": 2,
    "forwardZones": 0
  }
}
```

## API Endpoints

### Получение статистики конфигураций
```
GET /CONFIG/STATS
```
Требует роль: `sysadmin`

Возвращает:
```json
{
  "success": true,
  "data": {
    "totalFiles": 15,
    "byType": {
      "ns_group": 3,
      "acl": 5,
      "forward_group": 2,
      "server": 3,
      "zone": 2
    },
    "totalSize": 45123
  }
}
```

### Очистка старых конфигураций
```
GET /CONFIG/CLEANUP?keepVersions=10
```
Требует роль: `sysadmin`

Параметры:
- `keepVersions` (по умолчанию 10) - количество версий для сохранения

## Автоматическое сохранение

Система автоматически сохраняет конфигурации при:

1. **Создании новых объектов:**
   - Новая группа серверов
   - Новый ACL
   - Новая forward группа
   - Новый сервер
   - Новая зона

2. **Обновлении существующих объектов:**
   - Изменение группы серверов
   - Изменение ACL
   - Изменение forward группы
   - Изменение сервера
   - Добавление/удаление серверов из группы
   - Изменение primary сервера

3. **Синхронизации конфигураций:**
   - Полная конфигурация сервера при forceConfigSync
   - Bind конфигурация и зоны

## Управление версиями

- Каждое изменение создает новый файл с временной меткой
- Система поддерживает очистку старых версий
- По умолчанию сохраняется 10 последних версий каждого объекта
- Можно настроить количество сохраняемых версий

## Тестирование

Для тестирования системы используйте:

```bash
node test_config_saver.js
```

Скрипт протестирует:
- Сохранение всех типов конфигураций
- Получение статистики
- Поиск конфигураций по типу
- Получение последних конфигураций
- Очистку старых версий

## Мониторинг

Для мониторинга системы сохранения конфигураций:

1. **Проверка размера директории:**
   ```bash
   du -sh ./tmp/configs/
   ```

2. **Подсчет файлов по типам:**
   ```bash
   ls ./tmp/configs/ | cut -d'_' -f1 | sort | uniq -c
   ```

3. **Просмотр последних изменений:**
   ```bash
   ls -lt ./tmp/configs/ | head -10
   ```

## Безопасность

- Файлы конфигураций содержат только данные конфигурации
- Пароли SSH не сохраняются в конфигурациях
- Доступ к API статистики только для sysadmin
- Временные файлы автоматически очищаются

## Производительность

- Сохранение происходит асинхронно
- Не блокирует основные операции
- Автоматическая очистка предотвращает накопление файлов
- Минимальное влияние на производительность

## Восстановление

Для восстановления конфигурации из сохраненных файлов:

1. Найдите нужный файл конфигурации
2. Извлеките данные из JSON
3. Используйте API для восстановления конфигурации

Пример восстановления NS группы:
```javascript
const configData = JSON.parse(fs.readFileSync('./tmp/configs/ns_group_1_timestamp.json'));
const groupData = configData.group;
const servers = configData.servers;
// Восстановить через API
```

## Git интеграция

Система автоматически интегрирована с Git для полного отслеживания истории изменений:

### Автоматические коммиты
- Каждое изменение конфигурации автоматически создает Git коммит
- Коммиты содержат описательные сообщения (например: "ACL: production-acl", "Server ns1: Zone example.com (authority)")
- Все файлы конфигураций отслеживаются в Git

### Git репозиторий
- Автоматически инициализируется в директории `./tmp/configs/`
- Настроен с пользователем "DNS Config Manager" и email "config-manager@dns.local"
- Содержит .gitignore для исключения временных файлов

### Управление версиями
- Полная история изменений в Git
- Возможность отката к любой предыдущей версии
- Создание веток для экспериментальных изменений
- Создание тегов для важных релизов конфигураций

### Git API Endpoints

#### История коммитов
```
GET /CONFIG/GIT/HISTORY?limit=10
```

#### Детали коммита
```
GET /CONFIG/GIT/COMMIT/:hash
```

#### Управление ветками
```
GET /CONFIG/GIT/BRANCHES
POST /CONFIG/GIT/BRANCH {branchName}
POST /CONFIG/GIT/SWITCH {branchName}
```

#### Управление тегами
```
GET /CONFIG/GIT/TAGS
POST /CONFIG/GIT/TAG {tagName, message}
```

#### Откат к коммиту
```
POST /CONFIG/GIT/REVERT {hash, hard}
```

#### Статистика Git
```
GET /CONFIG/GIT/STATS
```

### Примеры использования Git функций

```javascript
// Получение истории коммитов
const history = await configSaver.getGitHistory(10);

// Создание ветки для эксперимента
await configSaver.createGitBranch('experimental-config');

// Создание тега для релиза
await configSaver.createGitTag('v1.0.0', 'Релиз конфигурации DNS');

// Откат к предыдущей версии
await configSaver.revertToGitCommit('abc123...', false);

// Получение статистики Git
const gitStats = await configSaver.getGitStats();
```
