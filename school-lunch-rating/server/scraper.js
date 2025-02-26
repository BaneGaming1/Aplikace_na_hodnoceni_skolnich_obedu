// server/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');

// Funkce pro získání názvu dne
function getDayName(dayNumber) {
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
  return days[dayNumber];
}

// Funkce pro získání dnešního data a následujících pracovních dnů
function getWorkDays() {
  const days = [];
  const today = new Date();
  let currentDay = today;

  while (days.length < 5) { // 5 pracovních dnů
    const dayNumber = currentDay.getDay();
    if (dayNumber !== 0 && dayNumber !== 6) { // Přeskočit víkendy
      days.push({
        date: new Date(currentDay),
        dayName: getDayName(dayNumber)
      });
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }
  return days;
}

async function scrapeMeals() {
  try {
    const response = await axios.get('https://strav.nasejidelna.cz/0341/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const menuData = {};
    const workDays = getWorkDays();

    // Najdeme jídla a přiřadíme je k pracovním dnům
    $('.jidelnicekTop.semibold').each((i, element) => {
      if (i < workDays.length) {
        const dayInfo = workDays[i];
        const meals = [];

        $(element).parent().parent().find('tr').each((j, row) => {
          const location = $(row).find('td').eq(2).text().trim();
          if (location === 'Ječná') {
            const type = $(row).find('td').eq(0).text().trim();
            const name = $(row).find('td').eq(3).text().trim();
            
            meals.push({
              id: meals.length + 1,
              type: type,
              name: name
            });
          }
        });

        if (meals.length > 0) {
          // Formát: "Pondělí 21.2."
          const formattedDate = `${dayInfo.dayName} ${dayInfo.date.getDate()}.${dayInfo.date.getMonth() + 1}.`;
          menuData[formattedDate] = meals;
        }
      }
    });

    console.log('Nalezená data:', menuData);
    return menuData;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    throw error;
  }
}

module.exports = { scrapeMeals };