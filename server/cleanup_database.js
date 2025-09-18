#!/usr/bin/env node

/**
 * Скрипт для очистки/удаления базы данных DNS Node Manager
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { execSync } = require('child_process');

async function cleanupDatabase() {
  console.log('🗑️  Скрипт очистки базы данных DNS Node Manager\n');

  try {
    // Загружаем конфигурацию базы данных
    const configPath = path.join(__dirname, 'config', 'database.yml');
    if (!fs.existsSync(configPath)) {
      throw new Error('Файл конфигурации базы данных не найден: ' + configPath);
    }
    
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configFile);
    
    const dbConfig = config.database;
    console.log('📋 Конфигурация базы данных:');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}\n`);

    // Показываем меню выбора
    console.log('Выберите действие:');
    console.log('1. Очистить все таблицы (оставить структуру)');
    console.log('2. Удалить базу данных полностью');
    console.log('3. Показать информацию о БД');
    console.log('4. Выход');
    
    // Для автоматического режима используем аргумент командной строки
    const args = process.argv.slice(2);
    let choice = args[0] || '3';
    
    if (!args[0]) {
      console.log('\nДля автоматического режима используйте: node cleanup_database.js [1|2|3]');
      choice = '3'; // По умолчанию показываем информацию
    }

    switch (choice) {
      case '1':
        await clearTables(dbConfig);
        break;
      case '2':
        await dropDatabase(dbConfig);
        break;
      case '3':
        await showDatabaseInfo(dbConfig);
        break;
      case '4':
        console.log('👋 Выход...');
        return;
      default:
        console.log('❌ Неверный выбор. Показываем информацию о БД...');
        await showDatabaseInfo(dbConfig);
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

async function clearTables(dbConfig) {
  console.log('\n🧹 Очистка всех таблиц...');
  
  try {
    // Подключаемся к базе данных
    const knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        charset: dbConfig.charset,
        timezone: dbConfig.timezone
      },
      debug: false
    });

    // Получаем список всех таблиц
    const tables = await knex.raw('SHOW TABLES');
    const tableNames = tables[0].map(row => Object.values(row)[0]);
    
    if (tableNames.length === 0) {
      console.log('📭 База данных пуста, таблиц не найдено');
      await knex.destroy();
      return;
    }

    console.log(`📋 Найдено таблиц: ${tableNames.length}`);
    console.log('   ' + tableNames.join(', '));

    // Отключаем проверку внешних ключей
    await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
    
    // Очищаем каждую таблицу
    for (const tableName of tableNames) {
      await knex.raw(`TRUNCATE TABLE \`${tableName}\``);
      console.log(`   ✅ Очищена таблица: ${tableName}`);
    }
    
    // Включаем обратно проверку внешних ключей
    await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
    
    await knex.destroy();
    console.log('\n🎉 Все таблицы успешно очищены!');
    console.log('💡 Для восстановления структуры запустите приложение - оно автоматически создаст таблицы');

  } catch (error) {
    console.error('❌ Ошибка при очистке таблиц:', error.message);
    throw error;
  }
}

async function dropDatabase(dbConfig) {
  console.log('\n💥 Удаление базы данных...');
  
  try {
    // Подключаемся к MySQL без указания базы данных
    const knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        charset: dbConfig.charset,
        timezone: dbConfig.timezone
      },
      debug: false
    });

    // Удаляем базу данных
    await knex.raw(`DROP DATABASE IF EXISTS \`${dbConfig.database}\``);
    
    await knex.destroy();
    console.log(`✅ База данных "${dbConfig.database}" успешно удалена!`);
    console.log('💡 Для создания новой БД запустите приложение - оно автоматически создаст базу данных и таблицы');

  } catch (error) {
    console.error('❌ Ошибка при удалении базы данных:', error.message);
    throw error;
  }
}

async function showDatabaseInfo(dbConfig) {
  console.log('\n📊 Информация о базе данных...');
  
  try {
    // Подключаемся к базе данных
    const knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        charset: dbConfig.charset,
        timezone: dbConfig.timezone
      },
      debug: false
    });

    // Проверяем существование базы данных
    try {
      await knex.raw('SELECT 1');
      console.log('✅ База данных существует и доступна');
    } catch (error) {
      console.log('❌ База данных не существует или недоступна');
      await knex.destroy();
      return;
    }

    // Получаем список таблиц
    const tables = await knex.raw('SHOW TABLES');
    const tableNames = tables[0].map(row => Object.values(row)[0]);
    
    console.log(`📋 Таблиц в базе данных: ${tableNames.length}`);
    
    if (tableNames.length > 0) {
      console.log('\n📊 Статистика по таблицам:');
      
      for (const tableName of tableNames) {
        try {
          const count = await knex(tableName).count('* as count');
          const rowCount = count[0].count;
          console.log(`   ${tableName}: ${rowCount} записей`);
        } catch (error) {
          console.log(`   ${tableName}: ошибка получения количества записей`);
        }
      }
    } else {
      console.log('📭 База данных пуста');
    }

    // Проверяем пользователей
    try {
      const users = await knex('user').select('name', 'role');
      console.log('\n👥 Пользователи в системе:');
      if (users.length > 0) {
        users.forEach(user => {
          console.log(`   - ${user.name} (${user.role})`);
        });
      } else {
        console.log('   Пользователи не найдены');
      }
    } catch (error) {
      console.log('\n👥 Таблица пользователей недоступна');
    }

    await knex.destroy();
    
    console.log('\n💡 Команды для очистки:');
    console.log('   node cleanup_database.js 1  # Очистить все таблицы');
    console.log('   node cleanup_database.js 2  # Удалить базу данных');

  } catch (error) {
    console.error('❌ Ошибка при получении информации о БД:', error.message);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  cleanupDatabase();
}

module.exports = { cleanupDatabase, clearTables, dropDatabase, showDatabaseInfo };
