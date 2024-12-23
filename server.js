const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'All4Jesus';

// Debugging: Log environment variables and server initialization
console.log('Starting server with the following configuration:');
console.log(`PORT: ${PORT}`);
console.log(`ADMIN_PASSWORD: ${ADMIN_PASSWORD ? '*****' : 'Not Set'}`);

// Constants for directory paths
const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(__dirname, 'images');
const CSS_DIR = path.join(__dirname, 'css');
const JS_DIR = path.join(__dirname, 'js');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['https://logan-new.github.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(helmet());
app.use(morgan('combined')); // Logging middleware
app.use('/css', express.static(CSS_DIR));
app.use('/js', express.static(JS_DIR));
app.use('/images', express.static(IMAGES_DIR));

// Helper function to ensure required files exist
const ensureFileExists = async (filePath, defaultContent = '{}') => {
  try {
    await fs.access(filePath);
    console.log(`File exists: ${filePath}`);
  } catch {
    console.log(`File missing, creating: ${filePath}`);
    await fs.writeFile(filePath, defaultContent, 'utf8');
  }
};

// Ensure required directories and files
const initializeFiles = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await ensureFileExists(path.join(DATA_DIR, 'services.json'), JSON.stringify({ services: [] }, null, 2));
    console.log('Initialization of directories and files completed.');
  } catch (err) {
    console.error('Critical error during initialization:', err);
    process.exit(1); // Exit if initialization fails
  }
};
initializeFiles();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(IMAGES_DIR, { recursive: true });
      cb(null, IMAGES_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleanFilename = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${cleanFilename}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  },
});

// Routes for serving HTML pages
app.use(express.static(__dirname));

app.get('/index', (req, res) => {
  console.log('GET request to /');
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/about', (req, res) => {
  console.log('GET request to /about');
  res.sendFile(path.join(__dirname, 'about.html'));
});
app.get('/services', (req, res) => {
  console.log('GET request to /services');
  res.sendFile(path.join(__dirname, 'services.html'));
});
app.get('/upload', (req, res) => {
  console.log('GET request to /upload');
  res.sendFile(path.join(__dirname, 'upload.html'));
});

// Health Check Endpoint
app.get('/healthz', (req, res) => {
  console.log('GET request to /healthz');
  res.status(200).send('OK');
});

// Admin authentication route
app.post('/api/admin-auth', (req, res) => {
  console.log('POST request to /api/admin-auth');
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, redirect: '/upload' });
  }
  res.status(401).json({ success: false, message: 'Incorrect password.' });
});

// Route to serve services.json
app.get('/api/services', async (req, res) => {
  console.log('GET request to /api/services');
  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(servicesData));
  } catch (err) {
    console.error('Error reading services.json:', err);
    res.status(500).json({ error: 'Failed to retrieve services data.' });
  }
});

// Add a new service
app.post(
  '/api/admin/add-service',
  upload.array('images', 40),
  [
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  ],
  async (req, res) => {
    console.log('POST request to /api/admin/add-service');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, coverPhoto } = req.body;
    const images = req.files.map((file) => `/images/${file.filename}`);
    if (images.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    try {
      const servicesPath = path.join(DATA_DIR, 'services.json');
      let servicesData = { services: [] };
      try {
        servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
      } catch {
        console.log('services.json is missing or empty.');
      }

      const newService = {
        id: Date.now().toString(),
        name,
        description,
        images,
        coverPhoto: coverPhoto ? `/images/${coverPhoto}` : images[0],
      };

      servicesData.services.push(newService);
      await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
      res.json({ success: true, message: 'Service added successfully!' });
    } catch (err) {
      console.error('Error saving new service:', err);
      res.status(500).json({ error: 'Failed to save new service.' });
    }
  }
);

// Global error handler
app.use((err, req, res, next) => {
  console.error(`Error on ${req.method} ${req.url}:`, err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Catch-all for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on dynamic port ${PORT}`);
});