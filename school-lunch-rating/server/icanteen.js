// server/icanteen.js
const axios = require('axios');

const ICANTEEN_CONFIG = {
  BASE_URL: 'https://strav.nasejidelna.cz',
  LOGIN_PATH: '/0341/login',
  LOGIN_CHECK_PATH: '/0341/j_spring_security_check',
  SUCCESS_URL: '/0341/faces/secured/main.jsp'
};

// Funkce pro extrakci CSRF tokenu z HTML
const extractCsrfToken = (html) => {
  const csrfRegex = /name="_csrf" value="([^"]+)"/;
  const match = html.match(csrfRegex);
  return match ? match[1] : null;
};

// Hlavní funkce pro ověření přihlášení
async function validateICanteenCredentials(username, password) {
  console.log(`Ověřování iCanteen přihlášení pro uživatele: ${username}`);
  
  // Testovací přihlášení
  if (username === 'test' && password === 'test') {
    console.log('Testovací přihlášení - úspěšné');
    return { success: true, message: 'Testovací přihlášení úspěšné' };
  }
  
  try {
    // 1. Získání přihlašovací stránky a CSRF tokenu
    console.log('Získávání přihlašovací stránky...');
    const loginPageResponse = await axios.get(
      `${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_PATH}`,
      { 
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }
    );
    
    const csrfToken = extractCsrfToken(loginPageResponse.data);
    if (!csrfToken) {
      console.error('CSRF token nebyl nalezen');
      return { success: false, message: 'Chyba získání bezpečnostního tokenu' };
    }
    
    console.log('CSRF token získán');
    
    // 2. Pokus o přihlášení
    const formData = new URLSearchParams();
    formData.append('j_username', username);
    formData.append('j_password', password);
    formData.append('_csrf', csrfToken);
    formData.append('_spring_security_remember_me', 'false');
    formData.append('terminal', 'false');
    
    // Nastavíme maxRedirects na 0, aby axios nesledoval přesměrování
    // a vracel nám status 302 při úspěšném přihlášení
    const loginResponse = await axios({
      method: 'post',
      url: `${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_CHECK_PATH}`,
      data: formData.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${ICANTEEN_CONFIG.BASE_URL}${ICANTEEN_CONFIG.LOGIN_PATH}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': loginPageResponse.headers['set-cookie'] // Použití cookies z první odpovědi
      },
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Akceptujeme i 302 přesměrování
      }
    });
    
    // 3. Vyhodnocení odpovědi
    if (loginResponse.status === 302) {
      const redirectUrl = loginResponse.headers.location;
      const isSuccess = redirectUrl && (
        redirectUrl.includes('/faces/secured/') || 
        redirectUrl.includes('terminal=false')
      );
      
      if (isSuccess) {
        console.log('Přihlášení úspěšné');
        return { success: true, message: 'Přihlášení úspěšné' };
      }
    }
    
    console.log('Přihlášení selhalo - neplatné údaje');
    return { success: false, message: 'Neplatné přihlašovací údaje' };
  } catch (error) {
    console.error('Chyba při ověřování iCanteen credentials:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
    return { success: false, message: 'Chyba při komunikaci s jídelnou' };
  }
}

module.exports = { validateICanteenCredentials };