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
app.get('/api/meals', async (req, res) => {
  try {
    // Získáme data přímo ze scraperu
    const meals = await scrapeMeals();
    
    // Přidáme unikátní ID pro jednotlivé dny a jídla, pokud ještě nemají
    // Tímto zajistíme, že každé jídlo bude mít své jedinečné ID
    let runningId = 1;
    const enrichedData = {};
    
    Object.keys(meals).forEach(dateKey => {
      enrichedData[dateKey] = meals[dateKey].map(meal => {
        if (!meal.id) {
          // Pokud nemá ID, přidáme ho
          meal.id = runningId++;
        }
        return meal;
      });
    });
    
    // Logujeme data pro debugování
    console.log('Obohacená jídla:', enrichedData);
    
    // Vracíme data klientovi
    res.json(enrichedData);
  } catch (error) {
    console.error('Chyba při získávání dat:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat' });
  }
});

// Přihlášení uživatele
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Jednoduchá validace, že email má správný formát
    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Zadejte platný email' });
    }
    
    // Kontrola, zda je doména spsejecna.cz
    if (!email.endsWith('@spsejecna.cz')) {
      return res.status(401).json({ error: 'Musíte použít školní email (@spsejecna.cz)' });
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
    
    res.json({ success: true, userId, email });
  } catch (error) {
    console.error('Chyba při přihlašování:', error);
    res.status(500).json({ error: 'Chyba serveru při přihlašování' });
  }
});

// Přidání hodnocení
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
    const numericMealId = Number(mealId);
    const numericUserId = Number(userId);
    
    // Pro day_meal_type_id použijeme kombinaci userId_mealId
    // Toto zaručuje že každý uživatel může hodnotit každé jídlo pouze jednou
    const dayMealTypeId = `${numericUserId}_${numericMealId}`;
    
    console.log('Generovaný day_meal_type_id:', dayMealTypeId);
    
    // Kontrola, zda uživatel již hodnotil toto konkrétní jídlo
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE user_id = ? AND meal_id = ?',
      [numericUserId, numericMealId]
    );
    
    if (existingRatings.length > 0) {
      return res.status(400).json({ 
        error: 'Toto jídlo jste již hodnotili'
      });
    }
    
    // Kontrola, zda jídlo existuje v databázi
    const [existingMeals] = await pool.query(
      'SELECT * FROM meals WHERE id = ?',
      [numericMealId]
    );
    
    // Pokud jídlo neexistuje, vytvoříme ho
    if (existingMeals.length === 0) {
      // Určíme typ jídla podle ID (lichá = Oběd 1, sudá = Oběd 2)
      const mealType = numericMealId % 2 === 0 ? 'Oběd 2' : 'Oběd 1';
      
      await pool.query(
        'INSERT INTO meals (id, date, meal_type, name) VALUES (?, CURDATE(), ?, ?)',
        [numericMealId, mealType, 'Jídlo z jídelníčku']
      );
    }
    
    // Vložení hodnocení do databáze
    await pool.query(
      'INSERT INTO ratings (meal_id, user_id, day_meal_type_id, taste, appearance, temperature, portion_size, price, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [numericMealId, numericUserId, dayMealTypeId, taste, appearance, temperature, portionSize, price, comment || '']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba při kontrole hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při kontrole hodnocení' });
  }
});

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});