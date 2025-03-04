const express = require('express');
const cors = require('cors');
const { scrapeMeals } = require('./scraper');
const { pool, testConnection } = require('./db');

// Inicializace Express aplikace
const app = express();

// Povolení CORS pro frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Parsování JSON v požadavcích
app.use(express.json());

// Test připojení k databázi při startu serveru
testConnection();

// Endpoint pro získání jídel
// server/index.js - upravená verze endpointu pro jídla
app.get('/api/meals', async (req, res) => {
  try {
    // Místo scrapování jídel je načteme přímo z databáze
    const [rows] = await pool.query(
      'SELECT id, DATE_FORMAT(date, "%d.%m.%Y") as date_formatted, meal_type, name FROM meals ORDER BY date, id'
    );
    
    // Zpracujeme data do požadovaného formátu
    const menuData = {};
    
    rows.forEach(row => {
      // Formátovaný datum jako klíč
      const dateKey = row.date_formatted;
      
      // Pokud tento den ještě nemáme, vytvoříme pro něj pole
      if (!menuData[dateKey]) {
        menuData[dateKey] = [];
      }
      
      // Přidáme jídlo do pole pro tento den
      menuData[dateKey].push({
        id: row.id,
        type: row.meal_type,
        name: row.name
      });
    });
    
    // Vrátíme data
    res.json(menuData);
  } catch (error) {
    console.error('Chyba při získávání dat:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat' });
  }
});

// Přihlášení uživatele
// Přihlášení uživatele
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Jednoduchá validace, že email má správný formát
    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Zadejte platný email' });
    }
    
    // Kontrola, zda uživatel existuje
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    let userId;
    
    if (users.length === 0) {
      // Uživatel neexistuje, vytvoříme ho
      const [result] = await pool.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, password] // V reálné aplikaci by heslo mělo být hashované!
      );
      userId = result.insertId;
    } else {
      // Uživatel existuje, ověříme heslo
      if (users[0].password !== password) {
        return res.status(401).json({ error: 'Nesprávné heslo' });
      }
      userId = users[0].id;
    }
    
    res.json({ success: true, userId });
  } catch (error) {
    console.error('Chyba při přihlašování:', error);
    res.status(500).json({ error: 'Chyba serveru při přihlašování' });
  }
});

// Přidání hodnocení
// Přidání hodnocení - opravená verze s převedením ID na číslo
app.post('/api/ratings', async (req, res) => {
  try {
    const { mealId, userId, taste, appearance, temperature, portionSize, price, comment } = req.body;
    
    console.log('Přijato hodnocení:', {
      mealId,
      userId,
      taste,
      appearance,
      temperature,
      portionSize, 
      price,
      comment
    });
    
    // Převedeme ID na čísla, pokud jsou poskytnuty jako řetězce
    const numericMealId = Number(mealId.replace(/[^0-9]/g, '')) || 1;
    const numericUserId = Number(userId) || 1;
    
    console.log('Převedená ID:', { numericMealId, numericUserId });
    
    // Kontrola, zda už toto hodnocení neexistuje
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [numericMealId, numericUserId]
    );
    
    if (existingRatings && existingRatings.length > 0) {
      return res.status(400).json({ error: 'Toto jídlo jste již hodnotili' });
    }
    
    // Kontrola, zda jídlo existuje, a pokud ne, vytvoříme ho
    const [existingMeals] = await pool.query(
      'SELECT id FROM meals WHERE id = ?',
      [numericMealId]
    );
    
    // Pokud jídlo neexistuje, vytvoříme ho
    if (existingMeals.length === 0) {
      // Používáme číslo ID
      await pool.query(
        'INSERT INTO meals (id, date, meal_type, name) VALUES (?, CURDATE(), ?, ?)',
        [numericMealId, 'Oběd', 'Jídlo z jídelníčku']
      );
    }
    
    // Kontrola, zda uživatel existuje
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [numericUserId]
    );
    
    // Pokud uživatel neexistuje, vytvoříme ho
    if (existingUsers.length === 0) {
      await pool.query(
        'INSERT INTO users (id, email, password) VALUES (?, ?, ?)',
        [numericUserId, `user${numericUserId}@example.com`, 'password123']
      );
    }
    
    // Přidání hodnocení
    await pool.query(
      'INSERT INTO ratings (meal_id, user_id, taste, appearance, temperature, portion_size, price, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [numericMealId, numericUserId, taste, appearance, temperature, portionSize, price, comment]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba při hodnocení:', error);
    res.status(500).json({ 
      error: 'Chyba serveru při ukládání hodnocení: ' + error.message,
      details: error.toString()
    });
  }
});

// Získání hodnocení pro konkrétní jídlo
app.get('/api/ratings/:mealId', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    // Získání všech hodnocení pro dané jídlo
    const [ratings] = await pool.query(
      'SELECT * FROM ratings WHERE meal_id = ?',
      [mealId]
    );
    
    res.json(ratings);
  } catch (error) {
    console.error('Chyba při získávání hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání hodnocení' });
  }
});

// Kontrola, zda uživatel již hodnotil dané jídlo
app.get('/api/ratings/check/:mealId/:userId', async (req, res) => {
  try {
    const { mealId, userId } = req.params;
    
    const [ratings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [mealId, userId]
    );
    
    res.json({ hasRated: ratings.length > 0 });
  } catch (error) {
    console.error('Chyba při kontrole hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při kontrole hodnocení' });
  }
});

// Získání databázových ID jídel
app.get('/api/meals/db-ids', async (req, res) => {
  try {
    // Získáme všechna jídla z databáze, řazena podle nejnovějších
    const [rows] = await pool.query(
      'SELECT id, date, meal_type, name FROM meals ORDER BY date DESC, id DESC'
    );
    
    // Zajistíme, že formát data je konzistentní v odpovědi
    const formattedRows = rows.map(row => ({
      ...row,
      date: row.date instanceof Date ? 
        row.date.toISOString().split('T')[0] : 
        row.date
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Chyba při získávání ID jídel:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat jídel' });
  }
});

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});