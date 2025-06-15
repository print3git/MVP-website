require('dotenv').config();
const express = require('express');

// Simple 1x1 placeholder image encoded as a data URI
const PLACEHOLDER_IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAAEElEQVR4nGNg+M9QzwAEYBxVSvzdgAAAAABJRU5ErkJggg==';

const app = express();
app.use(express.json());

app.post('/generate', (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt required' });
  res.json({ image: PLACEHOLDER_IMAGE });
});

const PORT = process.env.DALLE_PORT || 5002;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DALL-E mock server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
