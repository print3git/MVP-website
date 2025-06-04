// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// In-memory stores (swap out for a real database)
const jobs   = {};
const orders = {};

/**
 * POST /api/generate
 * Start a 3D generation job
 */
app.post('/api/generate', (req, res) => {
  const { prompt, imageB64 } = req.body;
  if (!prompt && !imageB64) {
    return res.status(400).json({ error: 'Prompt or image is required' });
  }
  const jobId = uuidv4();
  jobs[jobId] = {
    jobId,
    prompt: prompt || null,
    imageRef: imageB64 || null,
    status: 'pending',
    createdAt: new Date()
  };
  // TODO: enqueue a worker to call Hunyuan3D, download + reupload .glb, then set:
  // jobs[jobId].status = 'complete';
  // jobs[jobId].modelUrl = 'https://your-bucket/.../jobId.glb';
  res.json({ jobId, status: 'pending' });
});

/**
 * GET /api/status/:jobId
 * Poll job status and retrieve the model URL when ready
 */
app.get('/api/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    jobId:    job.jobId,
    status:   job.status,
    model_url: job.modelUrl || null,
    error:    job.error || null
  });
});

/**
 * POST /api/create-order
 * Create a Stripe Checkout session
 */
app.post('/api/create-order', async (req, res) => {
  const { jobId, price, shippingInfo } = req.body;
  if (!jobs[jobId]) {
    return res.status(404).json({ error: 'Job not found' });
  }
  // TODO: integrate with Stripe SDK instead of stubbing
  const sessionId   = uuidv4(); 
  const checkoutUrl = `https://checkout.stripe.com/pay/${sessionId}`;
  orders[sessionId] = { sessionId, jobId, status: 'pending', shippingInfo };
  res.json({ checkoutUrl });
});

/**
 * POST /api/webhook/stripe
 * Handle Stripe payment confirmation
 */
app.post('/api/webhook/stripe', (req, res) => {
  // TODO: verify Stripe signature in req.headers['stripe-signature']
  const event = req.body; // raw JSON webhook payload
  if (event.type === 'checkout.session.completed') {
    const sessionId = event.data.object.id;
    const order     = orders[sessionId];
    if (order) {
      order.status = 'paid';
      // TODO: trigger your print-queue worker, e.g.:
      // printQueue.enqueue({ jobId: order.jobId });
    }
  }
  res.sendStatus(200);
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
