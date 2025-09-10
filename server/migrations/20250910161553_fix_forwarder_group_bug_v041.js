
exports.up = function(knex) {
  return knex('zone')
    .whereNot('type', 'forward')
    .update('forwarder_group', null);
};

exports.down = function(knex) {
  return Promise.resolve();
};
