// server/index.js
const express = require('express');
const cors = require('cors');
const { scrapeMeals } = require('./scraper');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/meals', async (req, res) => {
  try {
    const meals = await scrapeMeals();
    console.log('Server odesílá data:', meals);
    res.json(meals);
  } catch (error) {
    console.error('Chyba:', error);
    res.status(500).json({ error: 'Nepodařilo se načíst jídla' });
  }
});

app.listen(5000, () => {
  console.log('Server běží na portu 5000');
});