const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { scrapeMeals } = require('./scraper');
const { pool, testConnection } = require('./db');
const { loginToICanteen } = require('./icanteen');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

testConnection();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Pokud jsme na Render, použijeme jejich disk
    const uploadDir = process.env.RENDER_DISK_PATH 
      ? path.join(process.env.RENDER_DISK_PATH, 'uploads')
      : path.join(__dirname, 'uploads');
    
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
    fileSize: 5 * 1024 * 1024
  }
});

app.use('/uploads', express.static(
  process.env.RENDER_DISK_PATH 
    ? path.join(process.env.RENDER_DISK_PATH, 'uploads')
    : path.join(__dirname, 'uploads')
));

app.get('/api/meals', async (req, res) => {
  try {
    const meals = await scrapeMeals();
    res.json(meals);
  } catch (error) {
    console.error('Chyba při získávání dat:', error);
    res.status(500).json({ error: 'Chyba serveru při načítání dat' });
  }
});

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

app.get('/api/meals/:mealId/images', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
    console.log('NAČÍTÁNÍ FOTOGRAFIÍ - mealId:', mealId);
    
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

app.delete('/api/images/:imageId', async (req, res) => {
  try {
    const imageId = req.params.imageId;
    console.log('Mazání fotografie ID:', imageId);
    
    const [images] = await pool.query('SELECT * FROM meal_images WHERE id = ?', [imageId]);
    
    if (images.length === 0) {
      return res.status(404).json({ error: 'Fotografie nebyla nalezena' });
    }
    
    try {
      const imagePath = path.join(__dirname, 'uploads', images[0].image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Soubor smazán:', imagePath);
      }
    } catch (err) {
      console.error('Chyba při mazání souboru:', err);
    }
    
    await pool.query('DELETE FROM meal_images WHERE id = ?', [imageId]);
    
    res.json({ success: true, message: 'Fotografie byla smazána' });
  } catch (error) {
    console.error('Chyba při mazání fotografie:', error);
    res.status(500).json({ error: 'Chyba při mazání fotografie' });
  }
});

app.post('/api/ratings', async (req, res) => {
  try {
    const { mealId, userId, taste, appearance, temperature, portionSize, price, comment } = req.body;
    
    console.log('PŘIDÁNÍ HODNOCENÍ - mealId:', mealId, 'userId:', userId, 'data:', req.body);
    
    // Kontrola všech povinných polí
    if (!mealId || !userId || !taste || !appearance || !temperature || !portionSize || !price) {
      return res.status(400).json({ 
        error: 'Chybí povinné hodnoty', 
        received: JSON.stringify(req.body) 
      });
    }
    
    // Kontrola duplicitního hodnocení - oprava klíče v tabulce ratings
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [mealId, userId]
    );
    
    if (existingRatings && existingRatings.length > 0) {
      console.log('Uživatel již hodnotil toto jídlo');
      return res.status(400).json({ error: 'Toto jídlo jste již hodnotili' });
    }
    
    // Vložení hodnocení s ošetřenými daty
    await pool.query(
      'INSERT INTO ratings (meal_id, user_id, taste, appearance, temperature, portion_size, price, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [mealId, userId, taste, appearance, temperature, portionSize, price, comment || '']
    );
    
    console.log('Hodnocení úspěšně přidáno');
    res.json({ success: true });
  } catch (error) {
    console.error('Chyba při hodnocení:', error);
    res.status(500).json({ 
      error: 'Chyba serveru při ukládání hodnocení', 
      details: error.message 
    });
  }
});

app.post('/api/icanteen-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('iCanteen login request:', { username });
    
    // Chybí-li některý z parametrů
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Uživatelské jméno a heslo jsou povinné' 
      });
    }
    
    // Pokus o přihlášení do iCanteen
    const iCanteenResult = await loginToICanteen(username, password);
    
    if (!iCanteenResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: 'Nesprávné uživatelské jméno nebo heslo' 
      });
    }
    
    // Ověříme, zda uživatel existuje v naší databázi, případně ho vytvoříme
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [`${username}@spsejecna.cz`]);
    
    let userId;
    
    if (users.length === 0) {
      // Uživatel neexistuje, vytvoříme ho
      const [result] = await pool.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [`${username}@spsejecna.cz`, 'icanteen-auth']  // Heslo není důležité při iCanteen auth
      );
      userId = result.insertId;
    } else {
      // Uživatel existuje
      userId = users[0].id;
    }
    
    // Odpověď s úspěšným přihlášením
    res.json({ 
      success: true, 
      userId, 
      email: `${username}@spsejecna.cz`
    });
  } catch (error) {
    console.error('Chyba při iCanteen přihlašování:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Chyba při komunikaci se serverem jídelny'
    });
  }
});

app.get('/api/ratings/:mealId', async (req, res) => {
  try {
    const mealId = req.params.mealId;
    
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

app.get('/api/ratings/check/:mealId/:userId', async (req, res) => {
  try {
    const { mealId, userId } = req.params;
    
    console.log('KONTROLA HODNOCENÍ - mealId:', mealId, 'userId:', userId);
    
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

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(401).json({ error: 'Zadejte platný email' });
    }
    
    if (!email.toLowerCase().includes('@spsejecna.cz')) {
      return res.status(401).json({ error: 'Přihlášení je povoleno pouze se školním emailem (@spsejecna.cz)' });
    }
    
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    let userId;
    
    if (users.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email, password]
      );
      userId = result.insertId;
    } else {
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

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Zadejte platný email' });
    }
    
    if (!email.toLowerCase().includes('@spsejecna.cz')) {
      return res.status(400).json({ error: 'Registrace je povolena pouze se školním emailem (@spsejecna.cz)' });
    }
    
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Uživatel s tímto emailem již existuje' });
    }
    
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

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});