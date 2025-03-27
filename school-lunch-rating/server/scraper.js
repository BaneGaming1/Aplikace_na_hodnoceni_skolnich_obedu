// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeMeals() {
  try {
    // Nastavení hlaviček pro simulaci běžného prohlížeče
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'cs-CZ,cs;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    console.log('Začínám scrapovat data z jídelníčku...');
    const response = await axios.get('https://strav.nasejidelna.cz/0341/login', { headers });
    
    // Načítáme HTML pomocí cheerio
    const $ = cheerio.load(response.data);
    const unsortedData = {};

    // Hlavní scrapování - metoda 1 (struktura jidelnicekDen)
    console.log('Hledám jídelníček strukturu 1...');
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme datum z elementu
      const dateText = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      if (!dateText) return;

      console.log(`Nalezen den: ${dateText}`);
      
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
          // Vytvoření unikátního ID s datem
          const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          let uniqueId;
          
          if (dateMatch) {
            // Vytvoříme ID ve formátu "20250318_Obed1"
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            uniqueId = `${year}${month}${day}_${type.replace(/\s+/g, '')}`;
          } else {
            uniqueId = `day${i}_${type.replace(/\s+/g, '')}_${j+1}`;
          }
          
          meals.push({
            id: uniqueId, 
            type: type,
            name: name,
            date: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null
          });
          console.log(`- Přidáno jídlo: ${type} - ${name} (ID: ${uniqueId})`);
        }
      });

      // Pokud máme jídla, přidáme je do výsledku
      if (meals.length > 0) {
        unsortedData[dateText] = meals;
      }
    });

    // Alternativní metoda scrapování - metoda 2 (tabulková struktura)
    if (Object.keys(unsortedData).length === 0) {
      console.log('Žádná data nenalezena v struktuře 1, zkoušíme strukturu 2...');
      
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
            console.log(`Nalezen den (struktura 2): ${dateText}`);
            
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
                
                // Vytvoření unikátního ID s datem
                const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                let uniqueId;
                
                if (dateMatch) {
                  // Vytvoříme ID ve formátu "20250318_Obed1"
                  const day = dateMatch[1].padStart(2, '0');
                  const month = dateMatch[2].padStart(2, '0');
                  const year = dateMatch[3];
                  uniqueId = `${year}${month}${day}_${type.replace(/\s+/g, '')}`;
                } else {
                  uniqueId = `day${i}_${type.replace(/\s+/g, '')}_${unsortedData[dateText].length+1}`;
                }
                
                unsortedData[dateText].push({
                  id: uniqueId,
                  type: type,
                  name: name,
                  date: dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null
                });
                console.log(`- Přidáno jídlo (struktura 2): ${type} - ${name} (ID: ${uniqueId})`);
              }
            }
          }
        }
      });
    }
    
    // ROZŠÍŘENÉ ŘAZENÍ - více dní dopředu i dozadu
    console.log('Řazení dat...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
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
        const diffTime = itemDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
        
        datesWithDistance.push({
          dateText: dateText,
          date: itemDate,
          distance: diffDays,
          meals: unsortedData[dateText]
        });
      }
    }
    
    // NOVÉ VYLEPŠENÉ ŘAZENÍ:
    // 1. Dnešní den
    // 2. Budoucí dny (zítřejší, pozítřejší, ...)
    // 3. Minulé dny (včerejší, předvčerejší, ...)
    // v rámci každé kategorie seřazeno od nejbližšího k nejvzdálenějšímu
    datesWithDistance.sort((a, b) => {
      // Dnešní den má přednost
      if (a.distance === 0) return -1;
      if (b.distance === 0) return 1;
      
      // Upřednostníme budoucí dny před minulými
      if (a.distance > 0 && b.distance < 0) return -1;
      if (a.distance < 0 && b.distance > 0) return 1;
      
      // V rámci budoucích dnů seřadíme od nejbližších
      if (a.distance > 0 && b.distance > 0) {
        return a.distance - b.distance;
      }
      
      // V rámci minulých dnů seřadíme od nejbližších
      if (a.distance < 0 && b.distance < 0) {
        return b.distance - a.distance;
      }
      
      return 0;
    });
    
    // Zkontrolujeme, zda máme dostatek dní do minulosti a budoucnosti
    // Chceme zobrazit alespoň 2 dny do minulosti a 3 dny do budoucnosti (pokud existují)
    let hasPastDays = datesWithDistance.some(item => item.distance < 0);
    let hasFutureDays = datesWithDistance.some(item => item.distance > 0);
    
    console.log(`Data obsahují minulé dny: ${hasPastDays}, budoucí dny: ${hasFutureDays}`);
    
    // Omezit počet dní pokud je jich opravdu hodně - zobrazíme jen relevantní dny
    // (máme dny od -2 do +3, plus dnešek)
    const filteredDates = datesWithDistance.filter(item => 
      item.distance >= -2 && item.distance <= 3
    );
    
    // Pokud jsme odfiltrovali nějaké dny, použijeme filtrovaný seznam
    const datesToUse = filteredDates.length >= 2 ? filteredDates : datesWithDistance;
    
    // Vytvoříme seřazený objekt
    const sortedData = {};
    for (const item of datesToUse) {
      sortedData[item.dateText] = item.meals;
      console.log(`Seřazeno: ${item.dateText} (vzdálenost od dneška: ${item.distance} dní)`);
    }
    
    console.log(`Scrapování dokončeno, nalezeno ${Object.keys(sortedData).length} dní`);
    return sortedData;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    return {};
  }
}

// Funkce pro samostatné testování
async function testScraper() {
  const meals = await scrapeMeals();
  console.log('Výsledek scrapování:', JSON.stringify(meals, null, 2));
}

// Pokud je soubor spuštěn přímo (node scraper.js), spustí se test
if (require.main === module) {
  testScraper().catch(console.error);
}

module.exports = { scrapeMeals };