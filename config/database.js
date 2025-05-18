const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(DB_NAME, USER, PASSWORD, {
  host: HOST,
  dialect: 'mysql',
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false
});


module.exports = sequelize;
