const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

async function createAdminUser() {
  let knex;
  
  try {
    // Load database configuration
    const configPath = path.join(__dirname, 'config', 'database.yml');
    if (!fs.existsSync(configPath)) {
      throw new Error('Database configuration file not found: ' + configPath);
    }
    
    const configFile = fs.readFileSync(configPath, 'utf8');
    const config = yaml.parse(configFile);
    
    knex = require('knex')({
      client: 'mysql2',
      connection: {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        charset: config.database.charset,
        timezone: config.database.timezone
      },
      pool: config.pool,
      debug: false
    });

    // Проверяем, есть ли уже пользователь admin
    const existingUser = await knex('user').where('name', 'admin').first();
    
    if (existingUser) {
      console.log('Пользователь admin уже существует!');
      console.log('Логин: admin');
      console.log('Пароль: admin123');
      return;
    }

    // Создаем хеш пароля
    const saltRounds = 10;
    const hash = await bcrypt.hash('admin123', saltRounds);

    // Добавляем пользователя
    await knex('user').insert({
      name: 'admin',
      secret: hash,
      role: 'sysadmin'
    });

    console.log('Пользователь admin успешно создан!');
    console.log('Логин: admin');
    console.log('Пароль: admin123');
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
  } finally {
    if (knex) {
      await knex.destroy();
    }
  }
}

createAdminUser();
