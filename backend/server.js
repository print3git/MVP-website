// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('./config');
const stripe = require('stripe')(config.stripeKey);
const { enqueuePrint, processQueue, progressEmitter } = require('./queue/printQueue');
const { sendMail } = require('./mail');
const { getShippingEstimate } = require('./shipping');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin';

const AUTH_SECRET = process.env.AUTH_SECRET || 'secret';

// Mapping of subreddit models and quotes stored server-side
const subredditModels = require('./subreddit_models.json');

const app = express();
app.use(morgan('dev'));
app.use(compression());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({ dest: uploadsDir });

const PORT = config.port;
const FALLBACK_GLB = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

function authOptional(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, AUTH_SECRET);
    } catch (err) {
      // ignore invalid token
    }
  }
  next();
}

function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id,username',
      [username, email, hash]
    );
    await db.query('INSERT INTO user_profiles(user_id) VALUES($1)', [rows[0].id]);
    const token = jwt.sign({ id: rows[0].id, username }, AUTH_SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username=$1', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username }, AUTH_SECRET);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', authRequired, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username, email FROM users WHERE id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    const profile = await db.query('SELECT shipping_info, payment_info, competition_notify FROM user_profiles WHERE user_id=$1', [req.user.id]);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      profile: profile.rows[0] || {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

/**
 * POST /api/generate
 * Accept a prompt and optional image uploads
 */
app.post('/api/generate', authOptional, upload.array('images'), async (req, res) => {
  const { prompt } = req.body;
  const files = req.files || [];
  if (!prompt && files.length === 0) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  const jobId = uuidv4();
  const imageRef = files[0] ? files[0].filename : null;
  const snapshot = req.body.snapshot || null;
  const userId = req.user ? req.user.id : null;

  try {
    await db.query(
      'INSERT INTO jobs(job_id, prompt, image_ref, status, user_id, snapshot) VALUES ($1,$2,$3,$4,$5,$6)',
      [jobId, prompt, imageRef, 'pending', userId, snapshot]
    );

    const form = new FormData();
    form.append('prompt', prompt);
    if (files[0]) {
      form.append('image', fs.createReadStream(files[0].path));
    }
    let generatedUrl = FALLBACK_GLB;
    try {
      const resp = await axios.post(`${config.hunyuanServerUrl}/generate`, form, {
        headers: form.getHeaders(),
      });
      generatedUrl = resp.data.glb_url;
    } catch (err) {
      console.error('Hunyuan service failed, using fallback', err.message);
    }

    await db.query('UPDATE jobs SET status=$1, model_url=$2 WHERE job_id=$3', [
      'complete',
      generatedUrl,
      jobId,
    ]);

    res.json({ jobId, glb_url: generatedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate model' });
  }
});

/**
 * GET /api/status
 * List recent jobs with pagination
 */
app.get('/api/status', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query(
      'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/status/:jobId
 * Poll job status and retrieve the model URL when ready
 */
app.get('/api/status/:jobId', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM jobs WHERE job_id=$1', [req.params.jobId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const job = rows[0];
    res.json({
      jobId: job.job_id,
      status: job.status,
      model_url: job.model_url,
      error: job.error,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * GET /api/config/stripe
 * Retrieve the Stripe publishable key
 */
app.get('/api/config/stripe', (req, res) => {
  res.json({ publishableKey: config.stripePublishable });
});

/**
 * GET /api/print-slots
 * Return the current number of available print slots
 */
app.get('/api/print-slots', (req, res) => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: 'numeric',
  });
  const hour = parseInt(dtf.format(new Date()), 10);
  let slots;
  if (hour >= 1 && hour < 4) slots = 9;
  else if (hour >= 4 && hour < 7) slots = 8;
  else if (hour >= 7 && hour < 10) slots = 7;
  else if (hour >= 10 && hour < 13) slots = 6;
  else if (hour >= 13 && hour < 16) slots = 5;
  else if (hour >= 16 && hour < 19) slots = 4;
  else if (hour >= 19 && hour < 22) slots = 3;
  else if (hour >= 22 && hour < 24) slots = 2;
  else slots = 1; // 12am - 1am
  res.json({ slots });
});

/**
 * GET /api/subreddit/:name
 * Retrieve model and quote for a subreddit
 */
app.get('/api/subreddit/:name', (req, res) => {
  const sr = req.params.name.toLowerCase();
  const entry = subredditModels[sr];
  if (!entry) return res.status(404).json({ error: 'Subreddit not found' });
  res.json(entry);
});

app.get('/api/progress/:jobId', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  const jobId = req.params.jobId;
  const send = (update) => {
    if (update.jobId === jobId) {
      res.write(`data: ${JSON.stringify(update)}\n\n`);
      if (update.progress === 100) {
        progressEmitter.removeListener('progress', send);
        res.end();
      }
    }
  };
  progressEmitter.on('progress', send);
  req.on('close', () => progressEmitter.removeListener('progress', send));
});

app.get('/api/my/models', authRequired, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query(
      `SELECT job_id, prompt, model_url, status, is_public, created_at, snapshot
       FROM jobs
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/my/orders', authRequired, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT o.session_id, o.job_id, o.price_cents, o.status, o.quantity, o.discount_cents, o.created_at, j.model_url
       FROM orders o
       JOIN jobs j ON o.job_id=j.job_id
       WHERE o.user_id=$1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/profile', authRequired, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM user_profiles WHERE user_id=$1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/profile', authRequired, async (req, res) => {
  const { shippingInfo, paymentInfo, competitionNotify } = req.body;
  try {
    await db.query(
      `INSERT INTO user_profiles(user_id, shipping_info, payment_info, competition_notify)
       VALUES($1,$2,$3,$4)
       ON CONFLICT (user_id)
       DO UPDATE SET shipping_info=$2, payment_info=$3, competition_notify=$4`,
      [req.user.id, shippingInfo || {}, paymentInfo || {}, competitionNotify !== false]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/users/:username/models', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE username=$1', [
      req.params.username,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const userId = rows[0].id;
    const models = await db.query(
      `SELECT j.job_id, j.prompt, j.model_url, j.status, j.is_public,
              j.created_at, j.snapshot,
              COALESCE(l.count,0) as likes
       FROM jobs j
       LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
       ON j.job_id=l.model_id
       WHERE j.user_id=$1 AND j.is_public=TRUE
       ORDER BY j.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    res.json(models.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

app.get('/api/users/:username/profile', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.display_name, p.avatar_url
       FROM users u
       JOIN user_profiles p ON u.username=p.username
       WHERE u.username=$1`,
      [req.params.username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.post('/api/models/:id/like', authRequired, async (req, res) => {
  const modelId = req.params.id;
  try {
    const { rows } = await db.query('SELECT 1 FROM likes WHERE user_id=$1 AND model_id=$2', [
      req.user.id,
      modelId,
    ]);
    if (rows.length) {
      await db.query('DELETE FROM likes WHERE user_id=$1 AND model_id=$2', [req.user.id, modelId]);
    } else {
      await db.query('INSERT INTO likes(user_id, model_id) VALUES($1,$2)', [req.user.id, modelId]);
    }
    const count = await db.query('SELECT COUNT(*) FROM likes WHERE model_id=$1', [modelId]);
    res.json({ likes: parseInt(count.rows[0].count, 10) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update like' });
  }
});

app.post('/api/models/:id/public', authRequired, async (req, res) => {
  const jobId = req.params.id;
  const { isPublic } = req.body;
  if (typeof isPublic !== 'boolean') {
    return res.status(400).json({ error: 'isPublic required' });
  }
  try {
    const { rows } = await db.query(
      'UPDATE jobs SET is_public=$1 WHERE job_id=$2 AND user_id=$3 RETURNING is_public',
      [isPublic, jobId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Model not found' });
    res.json({ is_public: rows[0].is_public });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

app.post('/api/models/:id/share', authRequired, async (req, res) => {
  const jobId = req.params.id;
  try {
    const slug = uuidv4();
    await db.insertShare(jobId, req.user.id, slug);
    res.json({ slug });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create share' });
  }
});

app.delete('/api/models/:id', authRequired, async (req, res) => {
  const jobId = req.params.id;
  try {
    const { rows } = await db.query(
      'DELETE FROM jobs WHERE job_id=$1 AND user_id=$2 RETURNING job_id',
      [jobId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Model not found' });
    await db.query('DELETE FROM likes WHERE model_id=$1', [jobId]);
    await db.query('DELETE FROM shares WHERE job_id=$1', [jobId]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

app.get('/api/shared/:slug', async (req, res) => {
  try {
    const share = await db.getShareBySlug(req.params.slug);
    if (!share) return res.status(404).json({ error: 'Share not found' });
    const { rows } = await db.query('SELECT prompt, model_url FROM jobs WHERE job_id=$1', [
      share.job_id,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Share not found' });
    res.json({
      jobId: share.job_id,
      slug: share.slug,
      model_url: rows[0].model_url,
      prompt: rows[0].prompt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch share' });
  }
});

app.get('/shared/:slug', async (req, res) => {
  try {
    const share = await db.getShareBySlug(req.params.slug);
    if (!share) return res.status(404).send('Not found');
    const { rows } = await db.query('SELECT prompt, model_url FROM jobs WHERE job_id=$1', [
      share.job_id,
    ]);
    const prompt = rows[0]?.prompt || 'Shared model';
    const ogImage = `${req.protocol}://${req.get('host')}/img/boxlogo.png`;
    res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta property="og:title" content="print3 shared model" />
    <meta property="og:description" content="${prompt.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:url" content="${req.protocol}://${req.get('host')}/shared/${share.slug}" />
  </head>
  <body>
    <script>window.location='/share.html?slug=${share.slug}'</script>
  </body>
</html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Submit a generated model to the community gallery
app.post('/api/community', authRequired, async (req, res) => {
  const { jobId, title, category } = req.body;
  if (!jobId) return res.status(400).json({ error: 'jobId required' });
  try {
    await db.query('INSERT INTO community_creations(job_id, title, category) VALUES($1,$2,$3)', [
      jobId,
      title || '',
      category || '',
    ]);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit' });
  }
});

function buildGalleryQuery(orderBy) {
  return `SELECT c.id, c.title, c.category, j.job_id, j.model_url, COALESCE(l.count,0) as likes
          FROM community_creations c
          JOIN jobs j ON c.job_id=j.job_id
          LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
          ON j.job_id=l.model_id
          WHERE ($3::text IS NULL OR c.category=$3)
            AND ($4::text IS NULL OR c.title ILIKE '%' || $4 || '%')
          ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
}

app.get('/api/community/recent', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const category = req.query.category || null;
  const search = req.query.search || null;
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';
  try {
    const { rows } = await db.query(buildGalleryQuery(`c.created_at ${order}`), [
      limit,
      offset,
      category,
      search,
    ]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch creations' });
  }
});

app.get('/api/community/popular', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;
  const category = req.query.category || null;
  const search = req.query.search || null;
  try {
    const { rows } = await db.query(buildGalleryQuery('likes DESC, c.created_at DESC'), [
      limit,
      offset,
      category,
      search,
    ]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch creations' });
  }
});

app.get('/api/competitions/active', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM competitions WHERE end_date >= CURRENT_DATE ORDER BY start_date'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch competitions' });
  }
});

app.get('/api/competitions/past', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.end_date, j.model_url
       FROM competitions c
       LEFT JOIN jobs j ON c.winner_model_id=j.job_id
       WHERE c.end_date < CURRENT_DATE AND c.winner_model_id IS NOT NULL
       ORDER BY c.end_date DESC LIMIT 5`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch past competitions' });
  }
});

app.get('/api/competitions/:id/entries', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.model_id, j.model_url, COALESCE(l.count,0) as likes
       FROM competition_entries e
       JOIN jobs j ON e.model_id=j.job_id
       LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
       ON e.model_id=l.model_id
       WHERE e.competition_id=$1
       ORDER BY likes DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/competitions/:id/comments', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cc.id, cc.text, cc.created_at, u.username
       FROM competition_comments cc
       JOIN users u ON cc.user_id=u.id
       WHERE cc.competition_id=$1
       ORDER BY cc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/competitions/:id/comments', authRequired, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO competition_comments(competition_id, user_id, text)
       VALUES($1,$2,$3)
       RETURNING id, text, created_at`,
      [req.params.id, req.user.id, text]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

app.post('/api/competitions/:id/enter', authRequired, async (req, res) => {
  const { modelId } = req.body;
  try {
    await db.query(
      'INSERT INTO competition_entries(competition_id, model_id, user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
      [req.params.id, modelId, req.user.id]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit entry' });
  }
});

function adminCheck(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Admin token required' });
  }
  next();
}

app.post('/api/admin/competitions', adminCheck, async (req, res) => {
  const { name, start_date, end_date, prize_description } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO competitions(name,start_date,end_date,prize_description)
       VALUES($1,$2,$3,$4) RETURNING *`,
      [name, start_date, end_date, prize_description]
    );
    const comp = rows[0];
    try {
      const recipients = await db.query(
        `SELECT u.email FROM users u JOIN user_profiles p ON u.id=p.user_id WHERE p.competition_notify=TRUE`
      );
      for (const r of recipients.rows) {
        await sendMail(
          r.email,
          'New Competition',
          `A new competition "${comp.name}" has been created.`
        );
      }
    } catch (err) {
      console.error('Failed to send competition notification', err);
    }
    res.json(comp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create competition' });
  }
});

app.put('/api/admin/competitions/:id', adminCheck, async (req, res) => {
  const { name, start_date, end_date, prize_description, winner_model_id } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE competitions SET name=$1, start_date=$2, end_date=$3, prize_description=$4, winner_model_id=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [name, start_date, end_date, prize_description, winner_model_id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update competition' });
  }
});

app.delete('/api/admin/competitions/:id', adminCheck, async (req, res) => {
  try {
    await db.query('DELETE FROM competitions WHERE id=$1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete competition' });
  }
});

/**
 * POST /api/shipping-estimate
 * Calculate shipping cost and ETA
 */
app.post('/api/shipping-estimate', async (req, res) => {
  const { destination, model } = req.body;
  if (!destination || !model) {
    return res.status(400).json({ error: 'destination and model required' });
  }
  try {
    const estimate = await getShippingEstimate(destination, model);
    res.json(estimate);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get shipping estimate' });
  }
});

/**
 * POST /api/create-order
 * Create a Stripe Checkout session
 */
app.post('/api/create-order', authOptional, async (req, res) => {
  const { jobId, price, shippingInfo, qty, discount } = req.body;
  try {
    const job = await db.query('SELECT job_id FROM jobs WHERE job_id=$1', [jobId]);
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let totalDiscount = discount || 0;

    if (req.user) {
      const { rows: paid } = await db.query(
        'SELECT 1 FROM orders WHERE user_id=$1 AND status=$2 LIMIT 1',
        [req.user.id, 'paid']
      );
      if (paid.length === 0) {
        const firstDisc = Math.round((price || 0) * (qty || 1) * 0.1);
        totalDiscount += firstDisc;
        await db.query('INSERT INTO incentives(user_id, type) VALUES($1,$2)', [
          req.user.id,
          'first_order',
        ]);
      }
    }

    const total = (price || 0) * (qty || 1) - totalDiscount;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: '3D Model' },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/payment.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment.html?cancel=1`,
      metadata: { jobId },
    });

    await db.query(
      'INSERT INTO orders(session_id, job_id, user_id, price_cents, status, shipping_info, quantity, discount_cents) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        session.id,
        jobId,
        req.user ? req.user.id : null,
        total,
        'pending',
        shippingInfo || {},
        qty || 1,
        totalDiscount,
      ]
    );

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const token = uuidv4();
  try {
    await db.query(
      `INSERT INTO mailing_list(email, token) VALUES($1,$2)
       ON CONFLICT (email) DO UPDATE SET token=$2, confirmed=FALSE`,
      [email, token]
    );
    const url = `${req.headers.origin}/api/confirm-subscription?token=${token}`;
    await sendMail(email, 'Confirm Subscription', `Click to confirm: ${url}`);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

app.get('/api/confirm-subscription', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Invalid token');
  try {
    await db.query('UPDATE mailing_list SET confirmed=TRUE WHERE token=$1', [token]);
    res.send('Subscription confirmed');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to confirm');
  }
});

/**
 * POST /api/webhook/sendgrid
 * Handle SendGrid event notifications
 */
app.post('/api/webhook/sendgrid', async (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [];
  try {
    for (const evt of events) {
      if (evt.event === 'bounce' || evt.event === 'spamreport') {
        const email = evt.email;
        if (email) {
          await db.query('UPDATE mailing_list SET unsubscribed=TRUE WHERE email=$1', [email]);
        }
      }
    }
  } catch (err) {
    console.error('Failed to process SendGrid webhook', err);
  }
  res.sendStatus(204);
});

/**
 * POST /api/webhook/stripe
 * Handle Stripe payment confirmation
 */
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhook);
  } catch (err) {
    console.error(err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.id;
    const sessionJobId = session.metadata && session.metadata.jobId;
    try {
      await db.query('UPDATE orders SET status=$1 WHERE session_id=$2', ['paid', sessionId]);

      let jobId = sessionJobId;
      if (!jobId) {
        const { rows } = await db.query('SELECT job_id FROM orders WHERE session_id=$1', [
          sessionId,
        ]);
        jobId = rows[0] && rows[0].job_id;
      }

      if (jobId) {
        enqueuePrint(jobId);
        processQueue();
      }
    } catch (err) {
      console.error(err);
    }
  }
  res.sendStatus(200);
});

app.get('/api/print-jobs/:id', async (req, res) => {
  const { rows } = await db.query('SELECT status FROM print_jobs WHERE id=$1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

async function checkCompetitionStart() {
  try {
    const comps = await db.query(
      `SELECT id, name FROM competitions WHERE start_date <= CURRENT_DATE AND start_notification_sent=FALSE`
    );
    if (comps.rows.length) {
      const recipients = await db.query(
        `SELECT u.email FROM users u JOIN user_profiles p ON u.id=p.user_id WHERE p.competition_notify=TRUE`
      );
      for (const comp of comps.rows) {
        for (const r of recipients.rows) {
          await sendMail(
            r.email,
            'Voting Open',
            `Voting is now open for competition "${comp.name}".`
          );
        }
        await db.query('UPDATE competitions SET start_notification_sent=TRUE WHERE id=$1', [
          comp.id,
        ]);
      }
    }
  } catch (err) {
    console.error('Failed to send start notifications', err);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
  checkCompetitionStart();
  setInterval(checkCompetitionStart, 3600000);
}

module.exports = app;
module.exports.checkCompetitionStart = checkCompetitionStart;
