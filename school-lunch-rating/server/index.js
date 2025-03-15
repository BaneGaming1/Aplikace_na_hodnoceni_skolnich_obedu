const express = require('express');
const cors = require('cors');
const { scrapeMeals } = require('./scraper');
const { pool, testConnection } = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Nastavení Multer pro nahrávání obrázků
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'meal-' + req.body.mealId + '-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Pouze obrázky mohou být nahrány!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Max 5MB
  }
});

// Zpřístupnění složky uploads pro statické soubory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test připojení k databázi při startu serveru
testConnection();

// =====================
// GALERIE - KLÍČOVÁ FUNKCIONALITA
// =====================

// ENDPOINT: Získání obrázků pro konkrétní jídlo
app.get('/api/gallery/:mealId', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    // Získání informací o jídle
    const [mealRows] = await pool.query(
      'SELECT id, date, meal_type as type, name FROM meals WHERE id = ?',
      [mealId]
    );
    
    const mealInfo = mealRows.length > 0 ? mealRows[0] : null;
    
    // Získání obrázků pro dané jídlo
    const [images] = await pool.query(
      `SELECT mi.id, mi.image_path, mi.created_at, u.email as uploaded_by
       FROM meal_images mi
       LEFT JOIN users u ON mi.user_id = u.id
       WHERE mi.meal_id = ?
       ORDER BY mi.created_at DESC`,
      [mealId]
    );
    
    res.json({ mealInfo, images });
  } catch (error) {
    console.error('Chyba při získávání galerie:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání galerie' });
  }
});

// ENDPOINT: Nahrání obrázku
app.post('/api/gallery/upload', upload.single('image'), async (req, res) => {
  try {
    const { mealId, userId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nebyl nahrán žádný soubor' });
    }
    
    // Kontrola, zda mealId existuje v databázi, případně ho vytvoříme
    const [existingMeals] = await pool.query(
      'SELECT id FROM meals WHERE id = ?',
      [mealId]
    );
    
    if (existingMeals.length === 0) {
      // Pokud jídlo neexistuje v databázi, vytvoříme záznam
      await pool.query(
        'INSERT INTO meals (id, date, meal_type, name) VALUES (?, CURDATE(), ?, ?)',
        [mealId, 'Oběd', 'Jídlo z jídelníčku']
      );
    }
    
    // Vložení záznamu o obrázku do databáze
    await pool.query(
      'INSERT INTO meal_images (meal_id, user_id, image_path) VALUES (?, ?, ?)',
      [mealId, userId, req.file.filename]
    );
    
    res.json({ 
      success: true,
      message: 'Obrázek byl úspěšně nahrán',
      filePath: req.file.filename
    });
  } catch (error) {
    console.error('Chyba při nahrávání obrázku:', error);
    res.status(500).json({ error: 'Chyba serveru při nahrávání obrázku' });
  }
});

// ENDPOINT: Smazání obrázku
app.delete('/api/gallery/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.body;
    
    // Kontrola, zda uživatel může smazat tento obrázek
    const [images] = await pool.query(
      `SELECT mi.*, u.role FROM meal_images mi
       JOIN users u ON mi.user_id = u.id
       WHERE mi.id = ?`,
      [imageId]
    );
    
    if (images.length === 0) {
      return res.status(404).json({ error: 'Obrázek nebyl nalezen' });
    }
    
    const image = images[0];
    
    // Kontrola, zda je uživatel vlastníkem nebo admin
    const [users] = await pool.query(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Neautorizovaný přístup' });
    }
    
    const userRole = users[0].role;
    
    if (image.user_id !== parseInt(userId) && userRole !== 'admin') {
      return res.status(403).json({ error: 'Nemáte oprávnění smazat tento obrázek' });
    }
    
    // Smazání souboru
    const filePath = path.join(__dirname, 'uploads', image.image_path);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Chyba při mazání souboru:', err);
      }
    });
    
    // Smazání záznamu z databáze
    await pool.query('DELETE FROM meal_images WHERE id = ?', [imageId]);
    
    res.json({ success: true, message: 'Obrázek byl úspěšně smazán' });
  } catch (error) {
    console.error('Chyba při mazání obrázku:', error);
    res.status(500).json({ error: 'Chyba serveru při mazání obrázku' });
  }
});

// =====================
// ZÁKLADNÍ FUNKCE APLIKACE
// =====================

// Endpoint pro získání jídel
app.get('/api/meals', async (req, res) => {
  try {
    // Získáme data přímo ze scraperu
    const meals = await scrapeMeals();
    
    // Přidáme unikátní ID pro jednotlivé dny a jídla, pokud ještě nemají
    let runningId = 1;
    const enrichedData = {};
    
    Object.keys(meals).forEach(dateKey => {
      const dateMatch = dateKey.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      let dateCode = '';
      if (dateMatch) {
        const day = String(dateMatch[1]).padStart(2, '0');
        const month = String(dateMatch[2]).padStart(2, '0');
        const year = dateMatch[3];
        dateCode = `${year}${month}${day}`;
      }
      
      enrichedData[dateKey] = meals[dateKey].map(meal => {
        if (!meal.id) {
          meal.id = runningId++;
        }
        meal.uniqueId = `${dateCode}_${meal.id}`;
        return meal;
      });
    });
    
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
    
    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Zadejte platný email' });
    }
    
    if (!email.endsWith('@spsejecna.cz')) {
      return res.status(401).json({ error: 'Musíte použít školní email (@spsejecna.cz)' });
    }
    
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

// Přidání hodnocení
app.post('/api/ratings', async (req, res) => {
  try {
    const { mealId, userId, taste, appearance, temperature, portionSize, price, comment } = req.body;
    
    if (!mealId || !userId) {
      return res.status(400).json({ error: 'Chybí povinné parametry' });
    }
    
    // Převedeme ID uživatele na číslo
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return res.status(400).json({ error: 'Neplatné ID uživatele' });
    }
    
    // Extrahujeme datum a ID jídla z mealId
    let numericMealId;
    let dateCode = '';
    
    const idParts = String(mealId).split('_');
    if (idParts.length > 1) {
      dateCode = idParts[0];
      numericMealId = parseInt(idParts[1], 10);
    } else {
      numericMealId = parseInt(mealId, 10);
      const today = new Date();
      dateCode = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    }
    
    if (isNaN(numericMealId)) {
      return res.status(400).json({ error: 'Neplatné ID jídla' });
    }
    
    // Vytvoříme unikátní identifikátor pro kombinaci uživatel-datum-jídlo
    const dayMealTypeId = `${numericUserId}_${dateCode}_${numericMealId}`;
    
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
    
    if (!mealId || !userId) {
      return res.status(400).json({ error: 'Chybí povinné parametry' });
    }
    
    const idParts = mealId.toString().split('_');
    
    try {
      if (idParts.length > 1) {
        const dateCode = idParts[0];
        const numericId = parseInt(idParts[1], 10);
        
        if (isNaN(numericId)) {
          return res.status(400).json({ error: 'Neplatné ID jídla' });
        }
        
        const dayMealTypeId = `${userId}_${dateCode}_${numericId}`;
        
        const [ratings] = await pool.query(
          'SELECT id FROM ratings WHERE day_meal_type_id = ?',
          [dayMealTypeId]
        );
        
        return res.json({ hasRated: ratings.length > 0 });
      } else {
        const numericMealId = parseInt(mealId, 10);
        const numericUserId = parseInt(userId, 10);
        
        if (isNaN(numericMealId) || isNaN(numericUserId)) {
          return res.status(400).json({ error: 'Neplatná ID' });
        }
        
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
    
    let numericMealId;
    const idParts = mealId.toString().split('_');
    if (idParts.length > 1) {
      numericMealId = Number(idParts[1]);
    } else {
      numericMealId = Number(mealId);
    }
    
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

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validace emailu
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Zadejte platný email' });
    }
    
    // Kontrola, zda je doména spsejecna.cz
    if (!email.endsWith('@spsejecna.cz')) {
      return res.status(400).json({ error: 'Musíte použít školní email (@spsejecna.cz)' });
    }
    
    // Kontrola délky hesla
    if (password.length < 6) {
      return res.status(400).json({ error: 'Heslo musí obsahovat alespoň 6 znaků' });
    }
    
    // Kontrola, zda uživatel již existuje
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje' });
    }
    
    // Vytvoření nového uživatele
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, password] // V reálné aplikaci by heslo mělo být hashované!
    );
    
    res.json({ 
      success: true, 
      message: 'Registrace byla úspěšná',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Chyba při registraci:', error);
    res.status(500).json({ error: 'Chyba serveru při registraci' });
  }
});

// Port, na kterém bude server běžet
const PORT = process.env.PORT || 5000;

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});