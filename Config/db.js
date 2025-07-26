const mysql = require('mysql2/promise');

// require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
require('dotenv').config();


const pool = mysql.createPool({
  host:process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00' 
});

// (async () => {
//   try {
//     const conn = await pool.getConnection();
//     console.log('✅ MySQL connection established.');
//     conn.release();
//   } catch (err) {
//     console.error('❌ MySQL connection failed:', err.message);
//   }
// })();

module.exports = pool;
