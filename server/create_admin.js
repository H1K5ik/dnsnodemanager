const bcrypt = require('bcrypt');
const knex = require('knex')({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: { filename: 'data/system.db' }
});

async function createAdminUser() {
  try {
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
    await knex.destroy();
  }
}

createAdminUser();
