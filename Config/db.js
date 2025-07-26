const mysql = require('mysql2/promise');
require('dotenv').config();

const assetPool = mysql.createPool({
  host: process.env.ASSET_DB_HOST,
  user: process.env.ASSET_DB_USER,
  password: process.env.ASSET_DB_PASS,
  database: process.env.ASSET_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

const dentalPool = mysql.createPool({
  host: process.env.DENTAL_DB_HOST,
  user: process.env.DENTAL_DB_USER,
  password: process.env.DENTAL_DB_PASS,
  database: process.env.DENTAL_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = { assetPool, dentalPool };
