const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'All4Jesus';

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Serve static pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/services.html')));
app.get('/admin/upload.html', (req, res) => res.sendFile(path.join(__dirname, 'admin/upload.html')));

// Serve services.json file
app.get('/data/services.json', (req, res) => {
  const servicesPath = path.join(__dirname, 'data/services.json');

  if (!fs.existsSync(servicesPath)) {
    return res.status(404).json({ error: 'Services data not found.' });
  }

  try {
    const servicesData = fs.readFileSync(servicesPath, 'utf-8');
    res.json(JSON.parse(servicesData));
  } catch (err) {
    console.error('Error reading services.json:', err);
    res.status(500).json({ error: 'Failed to read services data.' });
  }
});

// Admin authentication route
app.post('/admin-auth', (req, res) => {
  const { password } = req.body;
  console.log('Admin login attempt with password:', password);

  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
});

// Add a new service
app.post('/admin/add-service', (req, res) => {
  const { name, description, image } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'Name and description are required.' });
  }

  const servicesPath = path.join(__dirname, 'data/services.json');
  let servicesData;

  if (fs.existsSync(servicesPath)) {
    servicesData = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
  } else {
    servicesData = { services: [] };
  }

  const newService = {
    id: Date.now().toString(),
    name,
    description,
    image: image || '', // Handle optional image URL
  };

  servicesData.services.push(newService);
  fs.writeFileSync(servicesPath, JSON.stringify(servicesData, null, 2));

  res.json({ success: true, message: 'Service added successfully!' });
});

// Update an existing service
app.put('/admin/update-service/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, image } = req.body;
  const servicesPath = path.join(__dirname, 'data/services.json');

  const servicesData = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
  const service = servicesData.services.find((s) => s.id === id);

  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  if (name) service.name = name;
  if (description) service.description = description;
  if (image !== undefined) service.image = image;

  fs.writeFileSync(servicesPath, JSON.stringify(servicesData, null, 2));

  res.json({ success: true, message: 'Service updated successfully!' });
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
// Delete an existing service
app.delete('/admin/delete-service/:id', (req, res) => {
  const { id } = req.params;
  const servicesPath = path.join(__dirname, 'data/services.json');

  if (!fs.existsSync(servicesPath)) {
    return res.status(404).json({ error: 'Services data not found.' });
  }

  const servicesData = JSON.parse(fs.readFileSync(servicesPath, 'utf-8'));
  const serviceIndex = servicesData.services.findIndex((s) => s.id === id);

  if (serviceIndex === -1) {
    return res.status(404).json({ error: 'Service not found.' });
  }

  servicesData.services.splice(serviceIndex, 1);
  fs.writeFileSync(servicesPath, JSON.stringify(servicesData, null, 2));

  res.json({ success: true, message: 'Service deleted successfully!' });
});
