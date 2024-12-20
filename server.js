const express = require('express');
const app = express();

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.status(200).send('Hello, Render!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Minimal server running on dynamic port ${PORT}`);
});
