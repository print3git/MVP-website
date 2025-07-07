const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  const { prompt, fileKey } = req.body || {};
  if (!prompt || !fileKey) {
    return res.status(400).json({ error: 'prompt and fileKey are required' });
  }
  const url = `https://d2b5mm5pinpo2y.cloudfront.net/${fileKey}`;
  try {
    const { rows } = await db.query(
      'INSERT INTO models(prompt, url) VALUES($1,$2) RETURNING id, prompt, url, created_at',
      [prompt, url],
    );
    res.status(201).json(rows[0]);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to create model' });
  }
});

module.exports = router;
