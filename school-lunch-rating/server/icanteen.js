// server/icanteen.js
const axios = require('axios');
const cheerio = require('cheerio');

// Funkce pro validaci přihlašovacích údajů proti iCanteen
async function validateICanteenCredentials(username, password) {
  try {
    // 1. Nejprve získáme CSRF token z přihlašovací stránky
    const response = await axios.get('https://strav.nasejidelna.cz/0341/login');
    const $ = cheerio.load(response.data);
    const csrf = $('input[name="_csrf"]').val();
    
    if (!csrf) {
      return { success: false, message: 'Nepodařilo se získat bezpečnostní token' };
    }
    
    // 2. Vytvoříme formdata pro přihlášení
    const formData = new URLSearchParams();
    formData.append('j_username', username);
    formData.append('j_password', password);
    formData.append('_csrf', csrf);
    
    // 3. Odešleme přihlášení
    const loginResponse = await axios.post(
      'https://strav.nasejidelna.cz/0341/j_spring_security_check',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://strav.nasejidelna.cz/0341/login'
        },
        maxRedirects: 0,
        validateStatus: (status) => true  // Akceptujeme jakýkoliv status kód
      }
    );
    
    // 4. Vyhodnotíme odpověď - úspěšné přihlášení způsobí přesměrování (302)
    if (loginResponse.status === 302) {
      // Přihlášení bylo úspěšné
      return { success: true };
    } else {
      // Neplatné přihlašovací údaje
      return { success: false, message: 'Neplatné přihlašovací údaje' };
    }
  } catch (error) {
    console.error('Chyba při ověřování iCanteen:', error);
    return { success: false, message: 'Chyba při komunikaci se serverem iCanteen' };
  }
}

module.exports = { validateICanteenCredentials };