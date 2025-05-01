require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: 'MYSQL_URL',
    dialect: 'mysql',
  },
  test: {
    use_env_variable: 'MYSQL_URL',
    dialect: 'mysql',
  },
  production: {
    use_env_variable: 'MYSQL_URL',
    dialect: 'mysql',
  },
};
