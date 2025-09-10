# Миграции базы данных в DNS Node Manager

## Обзор

Проект использует Knex.js для управления миграциями базы данных. Миграции позволяют версионировать изменения схемы базы данных и применять их последовательно.

## Основные команды

### Создание новой миграции
```bash
npm run migrate:make название_миграции
```

### Применение всех миграций
```bash
npm run migrate:latest
```

### Откат последней миграции
```bash
npm run migrate:rollback
```

### Проверка статуса миграций
```bash
npm run migrate:status
```

### Запуск seed данных
```bash
npm run seed:run
```

## Структура файлов

- `knexfile.js` - конфигурация Knex.js
- `migrations/` - директория с файлами миграций
- `seeds/` - директория с seed данными

## Создание миграции

1. Создайте новую миграцию:
```bash
npm run migrate:make add_new_table
```

2. Отредактируйте созданный файл в `migrations/`:
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('new_table', table => {
    table.increments('id').primary();
    table.string('name');
    table.timestamps();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('new_table');
};
```

## Типы изменений в миграциях

### Создание таблицы
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary();
    table.string('username').unique();
    table.string('email');
    table.timestamps();
  });
};
```

### Добавление колонки
```javascript
exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('phone');
  });
};
```

### Изменение колонки
```javascript
exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.string('email', 255).alter();
  });
};
```

### Добавление индекса
```javascript
exports.up = function(knex) {
  return knex.schema.table('users', table => {
    table.index('email');
  });
};
```

### Внешние ключи
```javascript
exports.up = function(knex) {
  return knex.schema.table('posts', table => {
    table.integer('user_id').unsigned().references('id').inTable('users');
  });
};
```

## Seed данные

Seed файлы используются для заполнения базы данных начальными данными.

### Создание seed файла
```bash
npm run seed:make initial_users
```

### Пример seed файла
```javascript
exports.seed = function(knex) {
  return knex('users').del()
    .then(() => {
      return knex('users').insert([
        { username: 'admin', email: 'admin@example.com' },
        { username: 'user1', email: 'user1@example.com' }
      ]);
    });
};
```

## Лучшие практики

1. **Всегда создавайте откат (down)** - каждая миграция должна иметь возможность отката
2. **Тестируйте миграции** - проверяйте миграции на тестовых данных
3. **Не изменяйте существующие миграции** - создавайте новые миграции для изменений
4. **Используйте транзакции** - Knex автоматически оборачивает миграции в транзакции
5. **Делайте миграции атомарными** - одна миграция = одно логическое изменение

## Автоматический запуск

Миграции автоматически запускаются при старте приложения через `DatabaseConnector.js`. Это обеспечивает, что база данных всегда находится в актуальном состоянии.

## Отладка

Если миграция не выполняется:

1. Проверьте статус: `npm run migrate:status`
2. Проверьте логи приложения
3. Убедитесь, что база данных доступна
4. Проверьте синтаксис SQL в миграции

## Примеры

### Добавление новой таблицы
```bash
npm run migrate:make add_audit_log
```

```javascript
exports.up = function(knex) {
  return knex.schema.createTable('audit_log', table => {
    table.increments('id').primary();
    table.string('action');
    table.string('user_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('audit_log');
};
```

### Изменение существующей таблицы
```bash
npm run migrate:make add_user_phone
```

```javascript
exports.up = function(knex) {
  return knex.schema.table('user', table => {
    table.string('phone', 20);
  });
};

exports.down = function(knex) {
  return knex.schema.table('user', table => {
    table.dropColumn('phone');
  });
};
```
