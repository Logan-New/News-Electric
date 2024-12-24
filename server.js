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
app.use(express.static(__dirname));

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
app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});
app.get('/services', (req, res) => {
  res.sendFile(path.join(__dirname, 'services.html'));
});
app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

// Health Check Endpoint
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Admin authentication route
app.post('/api/admin-auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, redirect: '/upload' });
  }
  res.status(401).json({ success: false, message: 'Incorrect password.' });
});

// Route to serve services.json
app.get('/api/services', async (req, res) => {
  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json(JSON.parse(servicesData));
  } catch (err) {
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, coverPhoto } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded or invalid file types.' });
    }

    const images = req.files.map((file) => `/images/${file.filename}`);
    const coverPhotoPath = images.includes(`/images/${coverPhoto}`) ? `/images/${coverPhoto}` : images[0];

    const newService = {
      id: Date.now().toString(),
      name,
      description,
      images,
      coverPhoto: coverPhotoPath,
    };

    try {
      const servicesPath = path.join(DATA_DIR, 'services.json');
      const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
      servicesData.services.push(newService);
      await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
      res.json({ success: true, message: 'Service added successfully!', newService });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save the service.' });
    }
  }
);

// Update an existing service
app.put(
  '/api/admin/update-service/:id',
  upload.array('images', 40),
  async (req, res) => {
    const { id } = req.params;
    const { name, description, coverPhoto } = req.body;

    try {
      const servicesPath = path.join(DATA_DIR, 'services.json');
      const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
      const service = servicesData.services.find((s) => s.id === id);

      if (!service) {
        return res.status(404).json({ error: 'Service not found.' });
      }

      service.name = name || service.name;
      service.description = description || service.description;

      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => `/images/${file.filename}`);
        service.images.push(...newImages);
      }

      service.coverPhoto = coverPhoto || service.images[0];

      await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
      res.json({ success: true, message: 'Service updated successfully!', service });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update the service.' });
    }
  }
);

// Delete a service
app.delete('/api/admin/delete-service/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
    const updatedServices = servicesData.services.filter((service) => service.id !== id);

    if (updatedServices.length === servicesData.services.length) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    await fs.writeFile(servicesPath, JSON.stringify({ services: updatedServices }, null, 2));
    res.json({ success: true, message: 'Service deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete the service.' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
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
