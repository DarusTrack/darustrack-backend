const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  pool: {
    max: 50,
    min: 10,
    acquire: 30000,
    idle: 10000
  },
  logging: false,
});

module.exports = sequelize;
