// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { enqueuePrint } = require('./queue/printQueue');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

const PORT = process.env.PORT || 3000;
const FALLBACK_GLB =
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb';



/**
 * POST /api/generate
 * Accept a prompt and optional image uploads
 */
app.post('/api/generate', upload.array('images'), async (req, res) => {
  const { prompt } = req.body;
  const files = req.files || [];
  if (!prompt && files.length === 0) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }

  const jobId    = uuidv4();
  const imageRef = files[0] ? files[0].filename : null;

  try {
    await db.query(
      'INSERT INTO jobs(job_id, prompt, image_ref, status) VALUES ($1,$2,$3,$4)',
      [jobId, prompt, imageRef, 'pending']
    );

    const form = new FormData();
    form.append('prompt', prompt);
    if (files[0]) {
      form.append('image', fs.createReadStream(files[0].path));
    }
    let generatedUrl = FALLBACK_GLB;
    try {
      const resp = await axios.post('http://localhost:4000/generate', form, {
        headers: form.getHeaders(),
      });
      generatedUrl = resp.data.glb_url;
    } catch (err) {
      console.error('Hunyuan service failed, using fallback', err.message);
    }

    await db.query(
      'UPDATE jobs SET status=$1, model_url=$2 WHERE job_id=$3',
      ['complete', generatedUrl, jobId]
    );

    res.json({ jobId, glb_url: generatedUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate model' });
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
      jobId:    job.job_id,
      status:   job.status,
      model_url: job.model_url,
      error:    job.error
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

/**
 * POST /api/create-order
 * Create a Stripe Checkout session
 */
app.post('/api/create-order', async (req, res) => {
  const { jobId, price, shippingInfo } = req.body;
  try {
    const job = await db.query('SELECT job_id FROM jobs WHERE job_id=$1', [jobId]);
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: '3D Model' },
            unit_amount: price || 0,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/payment.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/payment.html?cancel=1`,
      metadata: { jobId },
    });

    await db.query(
      'INSERT INTO orders(session_id, job_id, price_cents, status, shipping_info) VALUES($1,$2,$3,$4,$5)',
      [session.id, jobId, price || 0, 'pending', shippingInfo || {}]
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
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
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
        const { rows } = await db.query('SELECT job_id FROM orders WHERE session_id=$1', [sessionId]);
        jobId = rows[0] && rows[0].job_id;
      }

      if (jobId) {
        enqueuePrint(jobId);
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
