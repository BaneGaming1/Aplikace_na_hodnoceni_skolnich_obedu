const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Potřeba doinstalovat: npm install multer
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

// Konfigurace multer pro nahrávání obrázků
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nepodporovaný formát souboru'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Statické servírování složky uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== API ENDPOINTY ====================

// === JÍDLA ===

// Získání jídel z jídelníčku
app.get('/api/meals', async (req, res) => {
  try {
    // Získáme data přímo ze scraperu
    const meals = await scrapeMeals();
    res.json(meals);
  } catch (error) {
    console.error('Chyba při získávání dat:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat' });
  }
});

// Získání detailu konkrétního jídla
app.get('/api/meals/:id', async (req, res) => {
  try {
    const mealId = req.params.id;
    const [meals] = await pool.query('SELECT * FROM meals WHERE id = ?', [mealId]);
    
    if (meals.length === 0) {
      return res.status(404).json({ error: 'Jídlo nebylo nalezeno' });
    }
    
    res.json(meals[0]);
  } catch (error) {
    console.error('Chyba při získávání detailu jídla:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat jídla' });
  }
});

// === FOTOGRAFIE ===

// Nahrání fotografie jídla
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    const mealId = req.body.mealId;
    const userId = req.body.userId;
    
    console.log('Nahrávání fotografie pro jídlo ID:', mealId);
    
    if (!mealId || !userId) {
      return res.status(400).json({ error: 'Chybí ID jídla nebo uživatele' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Žádný soubor nebyl nahrán' });
    }
    
    // Kontrola, zda jídlo existuje, a pokud ne, vytvoříme ho
    const [existingMeals] = await pool.query('SELECT id FROM meals WHERE id = ?', [mealId]);
    
    if (existingMeals.length === 0) {
      await pool.query(
        'INSERT INTO meals (id, date, meal_type, name) VALUES (?, CURDATE(), ?, ?)',
        [mealId, 'Oběd', 'Jídlo z jídelníčku']
      );
    }
    
    // Vložení záznamu o fotografii
    await pool.query(
      'INSERT INTO meal_images (meal_id, user_id, image_path) VALUES (?, ?, ?)',
      [mealId, userId, req.file.filename]
    );
    
    res.json({ 
      success: true, 
      message: 'Fotografie úspěšně nahrána pro jídlo ID: ' + mealId
    });
  } catch (error) {
    console.error('Chyba při nahrávání fotografie:', error);
    res.status(500).json({ error: 'Chyba při nahrávání fotografie' });
  }
});

// Získání fotografií k jídlu
app.get('/api/meals/:mealId/images', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    console.log('Načítání fotografií pro jídlo ID:', mealId);
    
    const [images] = await pool.query(
      'SELECT mi.*, u.email FROM meal_images mi JOIN users u ON mi.user_id = u.id WHERE mi.meal_id = ? ORDER BY mi.created_at DESC',
      [mealId]
    );
    
    console.log('Nalezeno fotografií:', images.length);
    res.json(images);
  } catch (error) {
    console.error('Chyba při načítání fotografií:', error);
    res.status(500).json({ error: 'Chyba při načítání fotografií' });
  }
});

// === HODNOCENÍ ===

// Přidání hodnocení jídla
app.post('/api/ratings', async (req, res) => {
  try {
    const { mealId, userId, taste, appearance, temperature, portionSize, price, comment } = req.body;
    
    // Převedeme ID na čísla, pokud jsou poskytnuty jako řetězce
    const numericMealId = Number(mealId.replace(/[^0-9]/g, '')) || 1;
    const numericUserId = Number(userId) || 1;
    
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
    
    if (existingMeals.length === 0) {
      await pool.query(
        'INSERT INTO meals (id, date, meal_type, name) VALUES (?, CURDATE(), ?, ?)',
        [numericMealId, 'Oběd', 'Jídlo z jídelníčku']
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

// === UŽIVATELÉ ===

// Přihlášení uživatele
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Jednoduchá validace, že email má správný formát
    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Zadejte platný email' });
    }
    
    // Kontrola, že email obsahuje doménu školy
    if (!email.toLowerCase().includes('@spsejecna.cz')) {
      return res.status(401).json({ error: 'Přihlášení je povoleno pouze se školním emailem (@spsejecna.cz)' });
    }
    
    // Kontrola, zda uživatel existuje
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    let userId;
    
    if (users.length === 0) {
      // Uživatel neexistuje, vytvoříme ho
      const [result] = await pool.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, password]
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

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});