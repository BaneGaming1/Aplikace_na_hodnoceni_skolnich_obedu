const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { scrapeMeals } = require('./scraper');
const { pool, testConnection } = require('./db');
const { validateICanteenCredentials } = require('./icanteen');
const cheerio = require('cheerio');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', ],
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
    const userId = req.query.userId; // Přidáme userId jako query parametr
    
    console.log('Mazání fotografie ID:', imageId, 'požadavek od uživatele:', userId);
    
    // Nejprve získáme informace o fotografii včetně jejího vlastníka
    const [images] = await pool.query('SELECT * FROM meal_images WHERE id = ?', [imageId]);
    
    if (images.length === 0) {
      return res.status(404).json({ error: 'Fotografie nebyla nalezena' });
    }
    
    const image = images[0];
    
    // Kontrola, zda je uživatel vlastníkem obrázku
    if (image.user_id != userId) {
      console.log('Odmítnuto - uživatel není vlastníkem:', image.user_id, '!=', userId);
      return res.status(403).json({ 
        error: 'Nemáte oprávnění mazat tento obrázek',
        isOwner: false 
      });
    }
    
    // Uživatel je vlastníkem, můžeme smazat soubor
    try {
      const imagePath = path.join(__dirname, 'uploads', image.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log('Soubor smazán:', imagePath);
      }
    } catch (err) {
      console.error('Chyba při mazání souboru:', err);
      // Pokračujeme i když se soubor nepovede smazat
    }
    
    // Smažeme záznam z databáze
    await pool.query('DELETE FROM meal_images WHERE id = ?', [imageId]);
    
    res.json({ 
      success: true, 
      message: 'Fotografie byla smazána' 
    });
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

// Přidat do server/index.js

app.post('/api/icanteen-login', async (req, res) => {
  // Získat username a password z požadavku
  const username = req.body.username || req.headers['x-username'];
  const password = req.body.password || req.headers['x-password'];
  
  console.log(`Ověřuji přihlášení pro uživatele: ${username}`);
  
  // Test/test funguje vždy
  if (username === 'test' && password === 'test') {
    return res.json({
      success: true,
      userId: 'test-user',
      username: username
    });
  }
  
  try {
    // Skutečné ověření proti iCanteen
    const loginPage = await axios.get('https://strav.nasejidelna.cz/0341/login');
    const $ = cheerio.load(loginPage.data);
    const csrf = $('input[name="_csrf"]').val();
    
    if (!csrf) {
      return res.status(500).json({
        success: false,
        error: 'Nepodařilo se získat CSRF token'
      });
    }
    
    // Vytvoření formdata s CSRF tokenem
    const formData = new URLSearchParams();
    formData.append('j_username', username);
    formData.append('j_password', password);
    formData.append('_csrf', csrf);
    
    // Poslat požadavek na iCanteen
    const loginResponse = await axios.post(
      'https://strav.nasejidelna.cz/0341/j_spring_security_check',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://strav.nasejidelna.cz/0341/login'
        },
        maxRedirects: 0,
        validateStatus: (status) => true  // Akceptujeme jakýkoliv status
      }
    );
    
    // Ověřit výsledek - úspěšné přihlášení vrací status 302
    if (loginResponse.status === 302) {
      console.log('Přihlášení úspěšné!');
      
      // Vytvořit nebo najít uživatele v databázi
      let userId;
      try {
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [username]);
        
        if (users.length === 0) {
          // Vytvořit nového uživatele
          const [result] = await pool.query(
            'INSERT INTO users (email, password) VALUES (?, ?)',
            [username, password]
          );
          userId = result.insertId;
        } else {
          userId = users[0].id;
        }
      } catch (dbError) {
        console.error('DB Error:', dbError);
        userId = 'no-db-' + Date.now();
      }
      
      return res.json({
        success: true,
        userId: userId,
        username: username
      });
    } else {
      // Neúspěšné přihlášení
      console.log(`Přihlášení neúspěšné, status: ${loginResponse.status}`);
      return res.status(401).json({
        success: false,
        error: 'Neplatné přihlašovací údaje'
      });
    }
  } catch (error) {
    console.error('Chyba při ověřování:', error);
    return res.status(500).json({
      success: false,
      error: 'Chyba při komunikaci se serverem'
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