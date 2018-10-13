module.exports = {
  development: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'chamsocial',
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    charset: 'utf8mb4',
    logging: process.env.SQL_LOGGING ? console.log : false
  },
  test: {
    database: 'cham_test_db',
    username: 'root',
    password: null,
    host: '127.0.0.1',
    dialect: 'sqlite',
    storage: ':memory:',
    logging: () => {}
  },
  production: {
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || 'chamsocial',
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: process.env.MYSQL_PORT || 3306,
    dialect: 'mysql',
    charset: 'utf8mb4'
  }
}
