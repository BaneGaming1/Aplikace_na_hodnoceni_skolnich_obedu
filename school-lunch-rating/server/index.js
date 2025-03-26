const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { scrapeMeals } = require('./scraper');
const { pool, testConnection } = require('./db');

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
    
    console.log('PŘIDÁNÍ HODNOCENÍ - mealId:', mealId, 'userId:', userId);
    
    const [existingRatings] = await pool.query(
      'SELECT id FROM ratings WHERE meal_id = ? AND user_id = ?',
      [mealId, userId]
    );
    
    if (existingRatings && existingRatings.length > 0) {
      console.log('Uživatel již hodnotil toto jídlo');
      return res.status(400).json({ error: 'Toto jídlo jste již hodnotili' });
    }
    
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

app.post('/api/icanteen-login', async (req, res) => {
  try {
    // Získání přihlašovacích údajů z hlaviček
    const username = req.headers['x-username'];
    const password = req.headers['x-password'];
    
    // Kontrola údajů
    if (!username || !password) {
      return res.status(400).send('Chybí přihlašovací údaje');
    }
    
    // Testovací přihlášení pro vývoj
    if (username === 'test' && password === 'test') {
      return res.status(200).json({
        success: true,
        userId: 'test123',
        username: 'test'
      });
    }
    
    // Ověření proti iCanteen
    try {
      // Načtení přihlašovací stránky pro získání CSRF tokenu
      const loginPage = await axios.get('https://strav.nasejidelna.cz/0341/login');
      const $ = cheerio.load(loginPage.data);
      const csrf = $('input[name="_csrf"]').val();
      
      if (!csrf) {
        return res.status(500).send('Nepodařilo se načíst přihlašovací stránku');
      }
      
      // Sestavení přihlašovacího formuláře
      const formData = new URLSearchParams();
      formData.append('j_username', username);
      formData.append('j_password', password);
      formData.append('_csrf', csrf);
      
      // Odeslání přihlášení
      const loginResponse = await axios.post(
        'https://strav.nasejidelna.cz/0341/j_spring_security_check',
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://strav.nasejidelna.cz/0341/login'
          },
          maxRedirects: 0,
          validateStatus: () => true
        }
      );
      
      // Úspěšné přihlášení vrací přesměrování (302)
      if (loginResponse.status === 302) {
        // Přihlášení úspěšné
        return res.status(200).json({
          success: true,
          userId: Buffer.from(`${username}_${Date.now()}`).toString('base64'),
          username: username
        });
      } else {
        // Přihlášení neúspěšné
        return res.status(401).send('Neplatné přihlašovací údaje');
      }
    } catch (error) {
      console.error('Chyba při ověřování:', error);
      return res.status(500).send('Chyba při komunikaci se serverem jídelny');
    }
  } catch (error) {
    console.error('Obecná chyba:', error);
    return res.status(500).send('Chyba serveru');
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
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server běží na portu ${PORT}`);
});