const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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
    
    console.log('NAHRÁVÁNÍ FOTOGRAFIE - mealId:', mealId, 'userId:', userId);
    
    if (!mealId || !userId) {
      return res.status(400).json({ error: 'Chybí ID jídla nebo uživatele' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Žádný soubor nebyl nahrán' });
    }
    
    // DŮLEŽITÉ: Už NEKONVERTUJEME mealId na číslo - používáme ho jako string!
    await pool.query(
      'INSERT INTO meal_images (meal_id, user_id, image_path) VALUES (?, ?, ?)',
      [mealId, userId, req.file.filename]
    );
    
    console.log('Fotografie úspěšně nahrána');
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba při nahrávání fotografie:', error);
    res.status(500).json({ error: 'Chyba při nahrávání fotografie' });
  }
});

// Získání fotografií k jídlu - opravený endpoint
app.get('/api/meals/:mealId/images', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    console.log('NAČÍTÁNÍ FOTOGRAFIÍ - mealId:', mealId);
    
    // DŮLEŽITÉ: Už NEKONVERTUJEME mealId na číslo - používáme ho jako string!
    const [images] = await pool.query(
      'SELECT mi.*, u.email FROM meal_images mi ' +
      'JOIN users u ON mi.user_id = u.id ' +
      'WHERE mi.meal_id = ? ' +
      'ORDER BY mi.created_at DESC',
      [mealId]
    );
    
    console.log('Nalezeno fotografií:', images.length);
    
    res.json(images);
  } catch (error) {
    console.error('Chyba při načítání fotografií:', error);
    res.status(500).json({ error: 'Chyba při načítání fotografií' });
  }
});

// Mazání fotografie autorem
// Mazání fotografie - ÚPLNĚ NOVÁ VERZE
app.delete('/api/images/:imageId', async (req, res) => {
  try {
    const imageId = req.params.imageId;
    console.log('Mazání fotografie ID:', imageId);
    
    // Najdeme fotku v DB
    const [images] = await pool.query('SELECT * FROM meal_images WHERE id = ?', [imageId]);
    
    if (images.length === 0) {
      return res.status(404).json({ error: 'Fotografie nebyla nalezena' });
    }
    
    // Smažeme z filesystému
    try {
      const imagePath = path.join(__dirname, 'uploads', images[0].image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Soubor smazán:', imagePath);
      }
    } catch (err) {
      console.error('Chyba při mazání souboru:', err);
      // Pokračujeme i když se soubor nepovede smazat
    }
    
    // Smažeme z databáze
    await pool.query('DELETE FROM meal_images WHERE id = ?', [imageId]);
    
    res.json({ success: true, message: 'Fotografie byla smazána' });
  } catch (error) {
    console.error('Chyba při mazání fotografie:', error);
    res.status(500).json({ error: 'Chyba při mazání fotografie' });
  }
});

// === HODNOCENÍ ===

// V server/index.js upravte endpoint pro přidání hodnocení
app.post('/api/ratings', async (req, res) => {
  try {
    const { mealId, userId, taste, appearance, temperature, portionSize, price, comment } = req.body;
    
    console.log('PŘIDÁNÍ HODNOCENÍ - mealId:', mealId, 'userId:', userId);
    
    // DŮLEŽITÉ: Už NEKONVERTUJEME mealId na číslo - používáme ho jako string!
    
    // Kontrola, zda už toto hodnocení neexistuje
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [mealId, userId]
    );
    
    if (existingRatings && existingRatings.length > 0) {
      console.log('Uživatel již hodnotil toto jídlo');
      return res.status(400).json({ error: 'Toto jídlo jste již hodnotili' });
    }
    
    // Přidání hodnocení
    await pool.query(
      'INSERT INTO ratings (meal_id, user_id, taste, appearance, temperature, portion_size, price, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [mealId, userId, taste, appearance, temperature, portionSize, price, comment]
    );
    
    console.log('Hodnocení úspěšně přidáno');
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba při hodnocení:', error);
    res.status(500).json({ 
      error: 'Chyba serveru při ukládání hodnocení: ' + error.message
    });
  }
});

// Získání hodnocení pro konkrétní jídlo
app.get('/api/ratings/:mealId', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    // Získání všech hodnocení pro dané jídlo včetně emailu uživatele
    const [ratings] = await pool.query(
      `SELECT r.*, u.email 
       FROM ratings r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.meal_id = ?
       ORDER BY r.created_at DESC`,
      [mealId]
    );
    
    res.json(ratings);
  } catch (error) {
    console.error('Chyba při získávání hodnocení:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání hodnocení' });
  }
});

// Kontrola, zda uživatel již hodnotil dané jídlo - KRITICKÁ OPRAVA
app.get('/api/ratings/check/:mealId/:userId', async (req, res) => {
  try {
    const { mealId, userId } = req.params;
    
    console.log('KONTROLA HODNOCENÍ - mealId:', mealId, 'userId:', userId);
    
    // DŮLEŽITÉ: Už NEKONVERTUJEME mealId na číslo - používáme ho jako string!
    const [ratings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [mealId, userId]
    );
    
    console.log('Nalezeno hodnocení:', ratings.length);
    
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

// Registrace uživatele
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validace emailu
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Zadejte platný email' });
    }
    
    // Kontrola domény
    if (!email.toLowerCase().includes('@spsejecna.cz')) {
      return res.status(400).json({ error: 'Registrace je povolena pouze se školním emailem (@spsejecna.cz)' });
    }
    
    // Kontrola, zda již uživatel existuje
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje' });
    }
    
    // Vytvoření nového uživatele
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, password]
    );
    
    res.json({ 
      success: true, 
      userId: result.insertId,
      message: 'Registrace proběhla úspěšně'
    });
  } catch (error) {
    console.error('Chyba při registraci:', error);
    res.status(500).json({ error: 'Chyba serveru při registraci uživatele' });
  }
});

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});