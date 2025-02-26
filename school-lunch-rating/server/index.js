// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMeals() {
  try {
    const response = await axios.get('https://strav.nasejidelna.cz/0341/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const menuData = {};

    // Procházíme dny
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme datum
      const dateText = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      if (!dateText) return;

      const meals = [];

      // Najdeme všechny řádky s jídly
      $(dayElement).find('tr').each((j, row) => {
        // Kontrolujeme, zda je to pro Ječnou
        const cells = $(row).find('td');
        if (cells.length < 3) return;
        
        // Třetí sloupec obsahuje místo (Ječná, Štěpánská, Sokolská)
        const location = $(cells[2]).text().trim();
        if (location === 'Ječná') {
          // První sloupec je typ oběda
          const type = $(cells[0]).text().trim();
          // Čtvrtý sloupec je název jídla
          const name = $(cells[3]).text().trim();
          
          if (type && name) {
            meals.push({
              id: meals.length + 1,
              type: type,
              name: name
            });
          }
        }
      });

      // Přidáme jen pokud máme jídla pro Ječnou
      if (meals.length > 0) {
        menuData[dateText] = meals;
      }
    });

    console.log('Nalezená data pro Ječnou:', menuData);
    
    // Fallback na testovací data
    if (Object.keys(menuData).length === 0) {
      return {
        "Středa 26.02.2025": [
          {
            id: 1,
            type: "Oběd 1",
            name: "Hovězí vývar s fridátovými nudlemi, Šunkofleky, okurkový salát, vitamínový nápoj"
          },
          {
            id: 2,
            type: "Oběd 2",
            name: "Hovězí vývar s fridátovými nudlemi, Bezmasá čína, rýžové nudle, vitamínový nápoj"
          }
        ]
      };
    }
    
    return menuData;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    
    // Testovací data
    return {
      "Středa 26.02.2025": [
        {
          id: 1,
          type: "Oběd 1",
          name: "Hovězí vývar s fridátovými nudlemi, Šunkofleky, okurkový salát, vitamínový nápoj (Ječná)",
          location: "Ječná"
        },
        {
          id: 2,
          type: "Oběd 2",
          name: "Hovězí vývar s fridátovými nudlemi, Bezmasá čína, rýžové nudle, vitamínový nápoj (Ječná)",
          location: "Ječná"
        }
      ]
    };
  }
}

module.exports = { scrapeMeals };