// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMeals() {
  try {
    console.log('Začínám scrapování přes přihlašovací stránku...');
    const response = await axios.get('https://strav.nasejidelna.cz/0341/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const menuData = {};

    // Procházíme každý den jídelníčku
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme datum z elementu
      const dateText = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      if (!dateText) return;
      
      console.log(`Nalezeno datum: ${dateText}`);

      // Najdeme všechna jídla v daném dni
      const meals = [];
      $(dayElement).find('.column.jidelnicekItem').each((j, mealElement) => {
        // Najdeme typ jídla (Oběd 1/Oběd 2)
        const typeElement = $(mealElement).prevAll('.smallBoldTitle').first();
        const type = typeElement.text().trim();

        // Najdeme název jídla
        const name = $(mealElement).text().trim();

        // Zkontrolujeme, že máme všechna data
        if (type && name) {
          console.log(`Nalezeno jídlo: ${type} - ${name}`);
          meals.push({
            id: meals.length + 1,
            type: type,
            name: name
          });
        }
      });

      // Pokud máme jídla, přidáme je do výsledku
      if (meals.length > 0) {
        menuData[dateText] = meals;
      }
    });

    console.log('Nalezená data:', menuData);
    
    if (Object.keys(menuData).length === 0) {
      console.log('Zkouším alternativní způsob hledání jídel...');
      
      // Hledáme řádky, které obsahují informace o jídle
      $('tr').each((i, row) => {
        const rowText = $(row).text().trim();
        // Zkontrolujeme, zda řádek obsahuje "Oběd"
        if (rowText.includes('Oběd')) {
          console.log(`Nalezen řádek s obědem: ${rowText.substring(0, 50)}...`);
          
          // Pokusíme se najít datum
          let dateText = '';
          let currentElement = $(row);
          let found = false;
          
          // Zkusíme najít datum v předchozích elementech
          for (let k = 0; k < 5; k++) {
            currentElement = currentElement.prev();
            if (currentElement.length && currentElement.text().includes('.202')) {
              dateText = currentElement.text().trim();
              found = true;
              break;
            }
          }
          
          // Pokud jsme nenašli datum, zkusíme ho najít v nadřazených elementech
          if (!found) {
            currentElement = $(row).parent().parent();
            if (currentElement.length && currentElement.find('h2, h3, div.jidelnicekTop').length) {
              dateText = currentElement.find('h2, h3, div.jidelnicekTop').first().text().trim();
            }
          }
          
          if (dateText) {
            console.log(`Datum pro tento řádek: ${dateText}`);
            
            // Extrahujeme typ jídla a název
            const cells = $(row).find('td');
            if (cells.length >= 2) {
              const type = cells.first().text().trim();
              let name = '';
              
              // Projdeme všechny buňky a najdeme tu, která obsahuje nejdelší text
              cells.each((j, cell) => {
                const cellText = $(cell).text().trim();
                if (cellText.length > name.length && cellText !== type) {
                  name = cellText;
                }
              });
              
              if (type && name && type.includes('Oběd')) {
                console.log(`Extrahováno jídlo: ${type} - ${name}`);
                
                // Přidáme jídlo do výsledku
                if (!menuData[dateText]) {
                  menuData[dateText] = [];
                }
                
                menuData[dateText].push({
                  id: menuData[dateText].length + 1,
                  type: type,
                  name: name
                });
              }
            }
          }
        }
      });
    }
    
    console.log('Konečná data:', menuData);
    return menuData;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    return {};
  }
}

module.exports = { scrapeMeals };