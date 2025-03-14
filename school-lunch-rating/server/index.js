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
      // Extrahujeme datum z klíče pro pozdější použití v ID
      const dateMatch = dateKey.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      let dateCode = '';
      if (dateMatch) {
        // Formát: YYYYMMDD
        const day = String(dateMatch[1]).padStart(2, '0');
        const month = String(dateMatch[2]).padStart(2, '0');
        const year = dateMatch[3];
        dateCode = `${year}${month}${day}`;
      }
      
      enrichedData[dateKey] = meals[dateKey].map(meal => {
        if (!meal.id) {
          // Pokud nemá ID, přidáme ho
          meal.id = runningId++;
        }
        
        // Přidáme datum k ID pro unikátnost mezi dny
        meal.uniqueId = `${dateCode}_${meal.id}`;
        
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
    
    if (!mealId || !userId) {
      console.error('Chybí mealId nebo userId');
      return res.status(400).json({ error: 'Chybí povinné parametry' });
    }
    
    // Převedeme ID uživatele na číslo
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      console.error(`Neplatné ID uživatele: ${userId}`);
      return res.status(400).json({ error: 'Neplatné ID uživatele' });
    }
    
    // Extrahujeme datum a ID jídla z mealId
    let numericMealId;
    let dateCode = '';
    
    const idParts = String(mealId).split('_');
    if (idParts.length > 1) {
      // Formát je YYYYMMDD_id
      dateCode = idParts[0];
      numericMealId = parseInt(idParts[1], 10);
    } else {
      // Pokud nemá složený formát, zkusíme přímo převést na číslo
      numericMealId = parseInt(mealId, 10);
      
      // Získáme aktuální datum jako záložní řešení
      const today = new Date();
      dateCode = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    }
    
    // Kontrola platnosti ID jídla
    if (isNaN(numericMealId)) {
      console.error(`Neplatné ID jídla: ${mealId}`);
      return res.status(400).json({ error: 'Neplatné ID jídla' });
    }
    
    // Vytvoříme unikátní identifikátor pro kombinaci uživatel-datum-jídlo
    const dayMealTypeId = `${numericUserId}_${dateCode}_${numericMealId}`;
    console.log('Generovaný day_meal_type_id:', dayMealTypeId);
    
    // Kontrola, zda uživatel již hodnotil toto jídlo v tento den
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE day_meal_type_id = ?',
      [dayMealTypeId]
    );
    
    if (existingRatings.length > 0) {
      return res.status(400).json({ 
        error: 'Toto jídlo jste již pro tento den hodnotili'
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
    console.error('Chyba při hodnocení:', error);
    res.status(500).json({ 
      error: 'Chyba serveru při kontrole hodnocení', 
      details: error.message 
    });
  }
});

// Kontrola, zda uživatel již hodnotil dané jídlo
app.get('/api/ratings/check/:mealId/:userId', async (req, res) => {
  try {
    const { mealId, userId } = req.params;
    
    console.log(`Kontroluji hodnocení pro mealId: ${mealId}, userId: ${userId}`);
    
    // Nejprve zkontrolujeme, zda máme platná data
    if (!mealId || !userId) {
      console.error('Chybí mealId nebo userId');
      return res.status(400).json({ error: 'Chybí povinné parametry' });
    }
    
    // Extrahujeme části z mealId, pokud obsahuje formát date_id
    const idParts = mealId.toString().split('_');
    
    // Použijeme try-catch pro případ, že by došlo k chybě při konverzi na číslo
    try {
      // Kontrola pomocí dayMealTypeId (preferovaný způsob)
      if (idParts.length > 1) {
        // Je ve formátu datum_id
        const dateCode = idParts[0];
        const numericId = parseInt(idParts[1], 10);
        
        if (isNaN(numericId)) {
          console.error(`Neplatné ID jídla: ${mealId}`);
          return res.status(400).json({ error: 'Neplatné ID jídla' });
        }
        
        const dayMealTypeId = `${userId}_${dateCode}_${numericId}`;
        console.log('Kontrola day_meal_type_id:', dayMealTypeId);
        
        const [ratings] = await pool.query(
          'SELECT id FROM ratings WHERE day_meal_type_id = ?',
          [dayMealTypeId]
        );
        
        return res.json({ hasRated: ratings.length > 0 });
      } else {
        // Nemá složený formát, zkusíme starou metodu kontroly
        const numericMealId = parseInt(mealId, 10);
        const numericUserId = parseInt(userId, 10);
        
        if (isNaN(numericMealId) || isNaN(numericUserId)) {
          console.error(`Neplatná ID: mealId=${mealId}, userId=${userId}`);
          return res.status(400).json({ error: 'Neplatná ID' });
        }
        
        console.log(`Záložní kontrola: mealId=${numericMealId}, userId=${numericUserId}`);
        
        const [ratings] = await pool.query(
          'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
          [numericMealId, numericUserId]
        );
        
        return res.json({ hasRated: ratings.length > 0 });
      }
    } catch (err) {
      console.error('Chyba při parsování ID:', err);
      return res.status(400).json({ error: 'Chyba formátu ID' });
    }
  } catch (error) {
    console.error('Chyba při kontrole hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při kontrole hodnocení' });
  }
});

// Získání hodnocení pro konkrétní jídlo
app.get('/api/ratings/:mealId', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    // Extrahujeme číslo ID, pokud má formát date_id
    let numericMealId;
    const idParts = mealId.toString().split('_');
    if (idParts.length > 1) {
      numericMealId = Number(idParts[1]);
    } else {
      numericMealId = Number(mealId);
    }
    
    // Získání všech hodnocení pro dané jídlo
    const [ratings] = await pool.query(
      'SELECT * FROM ratings WHERE meal_id = ?',
      [numericMealId]
    );
    
    res.json(ratings);
  } catch (error) {
    console.error('Chyba při získávání hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání hodnocení' });
  }
});

// Endpoint pro statistiky hodnocení
app.get('/api/statistics', async (req, res) => {
  try {
    // Získáme statistiky podle různých kritérií
    
    // 1. Průměrné hodnocení chuti podle typu jídla
    const [tasteStats] = await pool.query(`
      SELECT m.meal_type, 
             AVG(CASE WHEN r.taste = 'vyborny' THEN 3 WHEN r.taste = 'prijatelne' THEN 2 ELSE 1 END) as avg_taste,
             COUNT(r.id) as count
      FROM ratings r
      JOIN meals m ON r.meal_id = m.id
      GROUP BY m.meal_type
    `);
    
    // 2. Rozložení hodnocení velikosti porcí
    const [portionStats] = await pool.query(`
      SELECT portion_size, COUNT(*) as count
      FROM ratings
      GROUP BY portion_size
    `);
    
    // 3. Rozložení hodnocení teploty jídla
    const [temperatureStats] = await pool.query(`
      SELECT temperature, COUNT(*) as count
      FROM ratings
      GROUP BY temperature
    `);
    
    // 4. Nejlépe a nejhůře hodnocená jídla
    const [topMeals] = await pool.query(`
      SELECT m.name, m.meal_type, 
             AVG(CASE WHEN r.taste = 'vyborny' THEN 3 WHEN r.taste = 'prijatelne' THEN 2 ELSE 1 END) as score,
             COUNT(r.id) as count
      FROM ratings r
      JOIN meals m ON r.meal_id = m.id
      GROUP BY m.id, m.name, m.meal_type
      HAVING count >= 5
      ORDER BY score DESC
      LIMIT 10
    `);
    
    const [worstMeals] = await pool.query(`
      SELECT m.name, m.meal_type, 
             AVG(CASE WHEN r.taste = 'vyborny' THEN 3 WHEN r.taste = 'prijatelne' THEN 2 ELSE 1 END) as score,
             COUNT(r.id) as count
      FROM ratings r
      JOIN meals m ON r.meal_id = m.id
      GROUP BY m.id, m.name, m.meal_type
      HAVING count >= 5
      ORDER BY score ASC
      LIMIT 10
    `);
    
    res.json({
      taste: tasteStats,
      portion: portionStats,
      temperature: temperatureStats,
      topMeals: topMeals,
      worstMeals: worstMeals
    });
  } catch (error) {
    console.error('Chyba při získávání statistik:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání statistik' });
  }
});

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});