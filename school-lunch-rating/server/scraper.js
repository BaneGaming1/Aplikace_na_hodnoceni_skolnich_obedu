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
    const unsortedData = {};

    // Procházíme každý den jídelníčku
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme datum z elementu
      const dateText = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      if (!dateText) return;

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
          meals.push({
            id: meals.length + 1,
            type: type,
            name: name
          });
        }
      });

      // Pokud máme jídla, přidáme je do výsledku
      if (meals.length > 0) {
        unsortedData[dateText] = meals;
      }
    });

    // Pokud jsme nenašli žádná data, zkusíme alternativní způsob
    if (Object.keys(unsortedData).length === 0) {
      // Hledáme řádky, které obsahují informace o jídle
      $('tr').each((i, row) => {
        const rowText = $(row).text().trim();
        // Zkontrolujeme, zda řádek obsahuje "Oběd"
        if (rowText.includes('Oběd')) {
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
                // Přidáme jídlo do výsledku
                if (!unsortedData[dateText]) {
                  unsortedData[dateText] = [];
                }
                
                unsortedData[dateText].push({
                  id: unsortedData[dateText].length + 1,
                  type: type,
                  name: name
                });
              }
            }
          }
        }
      });
    }
    
    // Získáme dnešní datum
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
    // Reset času na půlnoc pro přesné porovnání
    today.setHours(0, 0, 0, 0);
    
    // Nyní seřadíme data, nejdříve dnešní, pak budoucí, a nakonec minulé dny
    const datesWithDistance = [];
    
    for (const dateText in unsortedData) {
      // Hledáme pouze datumovou část ve formátu DD.MM.YYYY
      const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      
      if (dateMatch) {
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10) - 1; // Měsíce jsou 0-indexed v JS
        const year = parseInt(dateMatch[3], 10);
        
        const itemDate = new Date(year, month, day);
        itemDate.setHours(0, 0, 0, 0);
        
        // Vypočítáme rozdíl v dnech od dnešního dne
        const differenceInTime = itemDate.getTime() - today.getTime();
        const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
        
        datesWithDistance.push({
          dateText: dateText,
          date: itemDate,
          distance: differenceInDays,
          meals: unsortedData[dateText]
        });
      }
    }
    
    // Seřadíme nejdříve podle toho, jak blízko je datum k dnešku
    // Dnešní den (distance = 0) bude první, zítřejší (distance = 1) druhý, atd.
    // Minulé dny (distance < 0) budou na konci
    datesWithDistance.sort((a, b) => {
      // Pokud jsou oba dny v budoucnosti nebo oba v minulosti
      if ((a.distance >= 0 && b.distance >= 0) || (a.distance < 0 && b.distance < 0)) {
        return a.distance - b.distance;
      }
      // Pokud jeden je v budoucnosti a druhý v minulosti, 
      // budoucí jde první (menší číslo pro řazení)
      return a.distance < 0 ? 1 : -1;
    });
    
    // Vytvoříme seřazený objekt
    const sortedData = {};
    for (const item of datesWithDistance) {
      sortedData[item.dateText] = item.meals;
    }
    
    return sortedData;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    return {};
  }
}

module.exports = { scrapeMeals };