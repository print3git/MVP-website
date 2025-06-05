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
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin';

const AUTH_SECRET = process.env.AUTH_SECRET || 'secret';

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
  const userId = req.user ? req.user.id : null;

  try {
    await db.query(
      'INSERT INTO jobs(job_id, prompt, image_ref, status, user_id) VALUES ($1,$2,$3,$4,$5)',
      [jobId, prompt, imageRef, 'pending', userId]
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
  try {
    const { rows } = await db.query(
      'SELECT * FROM jobs WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch models' });
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

app.get('/api/users/:username/models', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE username=$1', [
      req.params.username,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const userId = rows[0].id;
    const models = await db.query(
      `SELECT j.*, COALESCE(l.count,0) as likes
       FROM jobs j
       LEFT JOIN (SELECT model_id, COUNT(*) as count FROM likes GROUP BY model_id) l
       ON j.job_id=l.model_id
       WHERE j.user_id=$1 ORDER BY j.created_at DESC`,
      [userId]
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

app.get('/api/competitions/:id/entries', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.model_id, COALESCE(l.count,0) as likes
       FROM competition_entries e
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
    res.json(rows[0]);
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
 * POST /api/create-order
 * Create a Stripe Checkout session
 */
app.post('/api/create-order', async (req, res) => {
  const { jobId, price, shippingInfo, qty, discount } = req.body;
  try {
    const job = await db.query('SELECT job_id FROM jobs WHERE job_id=$1', [jobId]);
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const total = (price || 0) * (qty || 1) - (discount || 0);
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
      'INSERT INTO orders(session_id, job_id, price_cents, status, shipping_info, quantity, discount_cents) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [session.id, jobId, total, 'pending', shippingInfo || {}, qty || 1, discount || 0]
    );

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
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

// Start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
