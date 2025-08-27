const bcrypt = require('bcrypt');
const knex = require('knex')({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: { filename: 'data/system.db' }
});

async function updateAdminPassword() {
  try {
    // Создаем хеш нового пароля
    const saltRounds = 10;
    const hash = await bcrypt.hash('admin123', saltRounds);

    // Обновляем пароль пользователя admin
    await knex('user')
      .where('name', 'admin')
      .update({ secret: hash });

    console.log('Пароль пользователя admin обновлен!');
    console.log('Логин: admin');
    console.log('Пароль: admin123');
  } catch (error) {
    console.error('Ошибка при обновлении пароля:', error);
  } finally {
    await knex.destroy();
  }
}

updateAdminPassword();
