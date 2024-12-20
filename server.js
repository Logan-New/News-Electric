const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const helmet = require('helmet');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
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
app.use('/css', express.static(CSS_DIR));
app.use('/js', express.static(JS_DIR));
app.use('/images', express.static(IMAGES_DIR));

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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'upload.html')));

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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, coverPhoto } = req.body;
    const images = req.files.map((file) => `/images/${file.filename}`);

    try {
      const servicesPath = path.join(DATA_DIR, 'services.json');
      let servicesData = { services: [] };
      try {
        servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
      } catch {
        // File doesn't exist yet
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

// Update a service
app.put('/api/admin/update-service/:id', upload.array('images', 40), async (req, res) => {
  const { id } = req.params;
  const { name, description, coverPhoto } = req.body;
  const images = req.files.map((file) => `/images/${file.filename}`);

  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
    const service = servicesData.services.find((s) => s.id === id);

    if (!service) return res.status(404).json({ error: 'Service not found.' });

    if (name) service.name = name;
    if (description) service.description = description;
    if (images.length > 0) service.images = images;
    if (coverPhoto) service.coverPhoto = `/images/${coverPhoto}`;

    await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
    res.json({ success: true, message: 'Service updated successfully!' });
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

// Delete a service
app.delete('/api/admin/delete-service/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
    const serviceIndex = servicesData.services.findIndex((s) => s.id === id);

    if (serviceIndex === -1) return res.status(404).json({ error: 'Service not found.' });

    const [removedService] = servicesData.services.splice(serviceIndex, 1);
    await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
    res.json({ success: true, message: 'Service deleted successfully!', service: removedService });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

// Delete an image
app.post('/api/admin/delete-image/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const { imageUrl } = req.body;

  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));
    const service = servicesData.services.find((s) => s.id === serviceId);

    if (!service) return res.status(404).json({ error: 'Service not found.' });

    service.images = service.images.filter((image) => image !== imageUrl);

    const imagePath = path.join(IMAGES_DIR, imageUrl.replace('/images/', ''));
    await fs.unlink(imagePath);

    await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
    res.json({ success: true, message: 'Image deleted successfully.' });
  } catch (err) {
    console.error('Error deleting image:', err);
    res.status(500).json({ error: 'Failed to delete image.' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
