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
    const days = {};

    // Procházíme všechny dny
    $('.jidelnicekDen').each((i, dayElement) => {
      // Získáme celý text s datem
      const dayTitle = $(dayElement).find('.jidelnicekTop.semibold').text().trim();
      // Např.: "Jídelníček na 21.02.2025 - Pátek" -> "Pátek 21.02.2025"
      const parts = dayTitle.split('-');
      if (parts.length === 2) {
        const date = parts[0].split('na')[1].trim();
        const day = parts[1].trim();
        const formattedDate = `${day} ${date}`;
        const dayMeals = [];

        $(dayElement).find('.container').each((j, element) => {
          const typeElement = $(element).find('.smallBoldTitle');
          const locationElement = $(element).find('.jidelnicekItem');
          const nameElement = $(element).find('.column.jidelnicekItem');

          if (locationElement.text().includes('Ječná')) {
            const type = typeElement.text().trim();
            const name = nameElement.text().trim();

            if (type && name) {
              dayMeals.push({
                id: dayMeals.length + 1,
                type: type,
                name: name
              });
            }
          }
        });

        if (dayMeals.length > 0) {
          days[formattedDate] = dayMeals;
        }
      }
    });

    console.log('Scraper nalezl jídla po dnech:', days);
    return days;
  } catch (error) {
    console.error('Chyba při scrapování:', error);
    throw error;
  }
}

module.exports = { scrapeMeals };