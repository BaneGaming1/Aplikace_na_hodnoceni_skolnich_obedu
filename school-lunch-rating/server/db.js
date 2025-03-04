// server/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'thastertyn.xyz',
  user: 'eshop_user',  // Upravte podle vašeho nastavení
  password: 'sivek1234',  // Upravte podle vašeho nastavení
  database: 'eshop'
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