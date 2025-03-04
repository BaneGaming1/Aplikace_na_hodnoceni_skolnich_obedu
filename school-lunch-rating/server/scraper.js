// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMeals() {
  try {
    console.log('Začínám načítat data z iCanteen...');
    
    // Vytvoříme prázdný objekt pro výsledky
    const menuData = {};
    
    // Načteme stránku jídelníčku
    const response = await axios.get('https://strav.nasejidelna.cz/0341/jidelnicek', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // Načteme HTML do cheerio
    const $ = cheerio.load(response.data);
    
    // Projdeme všechny dny v jídelníčku
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme datum dne
      const dateText = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      if (!dateText) return;
      
      // Vytvoříme pole pro jídla tohoto dne
      const dailyMeals = [];
      
      // Projdeme všechny řádky v tomto dni
      $(dayElement).find('tr').each((j, row) => {
        const rowText = $(row).text().trim();
        
        // Kontrola, zda řádek obsahuje "Ječná"
        if (rowText.includes('Ječná')) {
          // Najdeme všechny buňky v řádku
          const cells = $(row).find('td');
          
          let mealType = '';
          let mealName = '';
          
          // První buňka obvykle obsahuje typ jídla (Oběd 1, Oběd 2)
          if (cells.length > 0) {
            mealType = $(cells[0]).text().trim();
          }
          
          // Najdeme buňku s nejdelším textem, to bude pravděpodobně název jídla
          let maxLength = 0;
          cells.each((k, cell) => {
            const cellText = $(cell).text().trim();
            if (cellText.length > maxLength && !cellText.includes('Ječná') && cellText !== mealType) {
              maxLength = cellText.length;
              mealName = cellText;
            }
          });
          
          // Přidáme jídlo do pole, pokud máme všechny údaje
          if (mealType && mealName && mealType.includes('Oběd')) {
            dailyMeals.push({
              id: dailyMeals.length + 1,
              type: mealType,
              name: mealName
            });
          }
        }
      });
      
      // Přidáme jídla do výsledku, pokud nějaká máme
      if (dailyMeals.length > 0) {
        menuData[dateText] = dailyMeals;
      }
    });
    
    console.log('Nalezená data:', menuData);
    
    // Vrátíme nalezená data
    return menuData;
  } catch (error) {
    console.error('Chyba při načítání dat:', error);
    // V případě chyby vrátíme prázdný objekt
    return {};
  }
}

module.exports = { scrapeMeals };