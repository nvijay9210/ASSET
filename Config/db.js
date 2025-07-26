const mysql = require('mysql2/promise');
require('dotenv').config();

const createPool = (dbName, label) => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    dateStrings: true,
    supportBigNumbers: true,
    decimalNumbers: true,
  });

  pool.dbLabel = label; // add a name to the pool
  return pool;
};

// Main DB (Asset)
const assetDb = createPool(process.env.DB_NAME, 'asset');

// Dental DB (for clinic/dental/reception)
const dentalDb = createPool(process.env.DENTAL_DB_NAME, 'dental');

module.exports = {
  assetDb,
  dentalDb
};
