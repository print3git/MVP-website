process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));
const db = require('../db');

jest.mock('axios');
const axios = require('axios');

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://stripe.test' }) } },
  webhooks: { constructEvent: jest.fn(() => ({ type: 'checkout.session.completed', data: { object: { id: 'cs_test', metadata: { jobId: 'job1' } } } })) }
};
Stripe.mockImplementation(() => stripeMock);

jest.mock('../queue/printQueue', () => ({ enqueuePrint: jest.fn() }));
const { enqueuePrint } = require('../queue/printQueue');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
  axios.post.mockClear();
  enqueuePrint.mockClear();
});

test('POST /api/generate returns glb url', async () => {
  axios.post.mockResolvedValue({ data: { glb_url: '/models/test.glb' } });
  const res = await request(app).post('/api/generate').send({ prompt: 'test' });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('/models/test.glb');
});

test('GET /api/status returns job', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1', status: 'complete', model_url: 'url' }] });
  const res = await request(app).get('/api/status/1');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('complete');
});

test('Stripe create-order flow', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1' }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app).post('/api/create-order').send({ jobId: '1', price: 100 });
  expect(res.status).toBe(200);
  expect(res.body.checkoutUrl).toBe('https://stripe.test');
});

test('Stripe webhook updates order and enqueues print', async () => {
  db.query.mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'sig')
    .set('Content-Type', 'application/json')
    .send(payload);
  expect(res.status).toBe(200);
  expect(enqueuePrint).toHaveBeenCalledWith('job1');
});
