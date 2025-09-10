
const bcrypt = require('bcrypt');

exports.seed = function(knex) {
  // Deletes ALL existing entries
  return knex('user').del()
    .then(() => knex('view').del())
    .then(function () {
      // Inserts seed entries
      const defaultAdminHash = bcrypt.hashSync('admin123', 10);
      
      return Promise.all([
        knex('user').insert({
          name: 'admin', 
          secret: defaultAdminHash, 
          role: 'sysadmin'
        }),
        knex('view').insert({
          name: 'default'
        })
      ]);
    });
};
