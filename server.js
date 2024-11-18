const express = require('express');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Content Security Policy (CSP) to allow Google Fonts
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "style-src-elem": ["'self'", "https://fonts.googleapis.com"],
      "script-src": ["'self'"], // Adjust for external scripts if needed
    },
  })
);

// Serve static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public/about.html')));
app.get('/services', (req, res) => res.sendFile(path.join(__dirname, 'public/services.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin/upload.html')));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});