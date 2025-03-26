// server/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool(process.env.JAWSDB_URL ? {
  uri: process.env.JAWSDB_URL
} : {
  host: 'thastertyn.xyz',
  user: 'sivek',  
  password: 'sivek1234', 
  database: 'sys',
  port: 56969
});

// Test připojení
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Připojení k databázi úspěšné');
    connection.release();
    return true;
  } catch (error) {
    console.error('Chyba připojení k databázi:', error);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};