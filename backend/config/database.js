const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DB_DIALECT === 'mssql') {
  const useWindowsAuth = !process.env.DB_USER;   // no user = Windows Auth
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER || null, process.env.DB_PASS || null, {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT) || 1433,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt:                 false,
        trustServerCertificate:  true,
        ...(useWindowsAuth && { trustedConnection: true }),
      }
    },
    logging: false,
  });

} else if (process.env.DB_DIALECT === 'postgres') {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
  });

} else {
  // Default: SQLite (local dev, no setup needed)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './qa_nexus.db',
    logging: false,
  });
}

module.exports = sequelize;
