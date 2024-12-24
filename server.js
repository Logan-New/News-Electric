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

console.log('Starting server...');
console.log(`PORT: ${PORT}`);
console.log(`ADMIN_PASSWORD: ${ADMIN_PASSWORD ? '*****' : 'Not Set'}`);

const DATA_DIR = path.join(__dirname, 'data');
const IMAGES_DIR = path.join(__dirname, 'images');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: ['https://logan-new.github.io'], methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.static(__dirname));

const initializeFiles = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const servicesPath = path.join(DATA_DIR, 'services.json');
    await fs.writeFile(servicesPath, JSON.stringify({ services: [] }, null, 2), { flag: 'wx' });
  } catch (err) {
    console.error('Error during initialization:', err);
  }
};
initializeFiles();

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

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.get('/api/services', async (req, res) => {
  try {
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = await fs.readFile(servicesPath, 'utf-8');
    res.json(JSON.parse(servicesData));
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

app.post(
  '/api/admin/add-service',
  upload.array('images', 40),
  [
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters long'),
    body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, coverPhoto } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded.' });
    }

    const images = req.files.map((file) => `/images/${file.filename}`);
    const selectedCoverPhoto = coverPhoto && images.includes(coverPhoto) ? coverPhoto : images[0];

    try {
      const servicesPath = path.join(DATA_DIR, 'services.json');
      const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));

      const newService = { id: Date.now().toString(), name, description, images, coverPhoto: selectedCoverPhoto };
      servicesData.services.push(newService);

      await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
      res.json({ success: true, message: 'Service added successfully!' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add service.' });
    }
  }
);

app.put('/api/admin/update-service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));

    const service = servicesData.services.find((service) => service.id === id);
    if (!service) return res.status(404).json({ error: 'Service not found.' });

    const { name, description, coverPhoto } = req.body;
    service.name = name || service.name;
    service.description = description || service.description;
    service.coverPhoto = coverPhoto || service.coverPhoto;

    await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
    res.json({ success: true, message: 'Service updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

app.delete('/api/admin/delete-service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const servicesPath = path.join(DATA_DIR, 'services.json');
    const servicesData = JSON.parse(await fs.readFile(servicesPath, 'utf-8'));

    const serviceIndex = servicesData.services.findIndex((service) => service.id === id);
    if (serviceIndex === -1) return res.status(404).json({ error: 'Service not found.' });

    servicesData.services.splice(serviceIndex, 1);
    await fs.writeFile(servicesPath, JSON.stringify(servicesData, null, 2));
    res.json({ success: true, message: 'Service deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));