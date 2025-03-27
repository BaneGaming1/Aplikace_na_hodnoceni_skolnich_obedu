// server/icanteen.js
const axios = require('axios');

// Konstanta s konfigurací iCanteen serveru
const ICANTEEN_CONFIG = {
  BASE_URL: 'https://strav.nasejidelna.cz',
  LOGIN_PATH: '/0341/login',
  LOGIN_CHECK_PATH: '/0341/j_spring_security_check',
  SUCCESS_PATH: '/0341/faces/secured'
};

/**
 * Validuje přihlašovací údaje proti skutečnému iCanteen serveru
 */
async function validateICanteenCredentials(username, password) {
  try {
    console.log(`Ověřování přihlášení pro iCanteen uživatele: ${username}`);
    
    // 1. Nejprve získáme přihlašovací stránku pro získání CSRF tokenu
    const loginPageResponse = await axios.get(`${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_PATH}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    });
    
    // Extrakce CSRF tokenu
    const csrfMatch = loginPageResponse.data.match(/name="_csrf" value="([^"]+)"/);
    if (!csrfMatch || !csrfMatch[1]) {
      console.error('CSRF token nebyl nalezen v přihlašovací stránce');
      return { success: false, message: 'Technická chyba - nelze získat přihlašovací stránku' };
    }
    
    const csrfToken = csrfMatch[1];
    console.log('CSRF token získán:', csrfToken);
    
    // Získání cookies z odpovědi
    const cookies = loginPageResponse.headers['set-cookie'];
    if (!cookies || !cookies.length) {
      console.error('Cookies nebyly nalezeny v odpovědi');
      return { success: false, message: 'Technická chyba - nelze získat přihlašovací stránku' };
    }
    
    // 2. Odeslání přihlašovacího formuláře s CSRF tokenem
    const formData = new URLSearchParams();
    formData.append('j_username', username);
    formData.append('j_password', password);
    formData.append('_csrf', csrfToken);
    formData.append('_spring_security_remember_me', 'false');
    formData.append('terminal', 'false');
    
    // Provést HTTP požadavek s maxRedirects=0, abychom zachytili přesměrování
    const loginResponse = await axios({
      method: 'post',
      url: `${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_CHECK_PATH}`,
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies.join('; '),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_PATH}`
      },
      maxRedirects: 0, // Nesledovat přesměrování
      validateStatus: function(status) {
        return status >= 200 && status <= 302; // Akceptujeme i přesměrování
      }
    });
    
    // 3. Kontrola výsledku přihlášení
    if (loginResponse.status === 302) {
      const redirectLocation = loginResponse.headers.location;
      
      console.log('Přesměrování po přihlášení na:', redirectLocation);
      
      // Ověření, že přesměrování jde na zabezpečenou stránku (= úspěšné přihlášení)
      if (redirectLocation && (
          redirectLocation.includes(ICANTEEN_CONFIG.SUCCESS_PATH) || 
          redirectLocation.includes('terminal=false')
      )) {
        console.log('iCanteen přihlášení úspěšné!');
        return { success: true };
      }
    }
    
    // Jakýkoliv jiný výsledek znamená neúspěšné přihlášení
    console.log('iCanteen přihlášení NEÚSPĚŠNÉ!');
    return { success: false, message: 'Nesprávné uživatelské jméno nebo heslo' };
    
  } catch (error) {
    console.error('Chyba při validaci iCanteen:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
    }
    return { success: false, message: 'Chyba při komunikaci se serverem iCanteen' };
  }
}

module.exports = { validateICanteenCredentials };