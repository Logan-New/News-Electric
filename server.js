const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Use promises for non-blocking file operations
const multer = require('multer');
const helmet = require('helmet'); // Security middleware
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'All4Jesus';

// Constants for directory paths
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR)); // Serve static files from the 'public' directory
app.use(helmet()); // Add secure HTTP headers

// Set up multer for file uploads
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  },
});

// Routes for serving HTML pages from the root directory
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'services.html')));
app.get('/upload', (req, res) => res.sendFile(path.join(__dirname, 'upload.html')));

// Admin authentication route
app.post('/api/admin-auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, redirect: '/upload' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
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
  upload.array('images', 40), // Allow up to 40 images
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('cover-photo').optional().notEmpty().withMessage('Cover photo is required if selected'),
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
      } catch (err) {
        // If file does not exist, start with empty data
      }

      const newService = {
        id: Date.now().toString(),
        name,
        description,
        images,
        coverPhoto: coverPhoto ? `/images/${coverPhoto}` : images[0], // Use the first image as the cover photo if none is selected
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

// Update an existing service
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

// Delete an existing service
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

// DELETE an image from a service
app.post('/api/admin/delete-image/:serviceId', async (req, res) => {
  const { serviceId } = req.params;
  const { imageUrl } = req.body; // The image URL to delete

  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));

    const service = servicesData.services.find((s) => s.id === serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found.' });

    // Remove the image from the service's images array
    service.images = service.images.filter((image) => image !== imageUrl);

    // Delete the image from the file system
    const imagePath = path.join(PUBLIC_DIR, imageUrl.replace('/images/', ''));
    await fs.unlink(imagePath); // Remove the image from the filesystem

    // Save the updated services data
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
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
