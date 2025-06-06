process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({ query: jest.fn().mockResolvedValue({ rows: [] }) }));
const db = require('../db');

jest.mock('stripe');
const Stripe = require('stripe');
Stripe.mockImplementation(() => ({}));

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
});

test('GET /api/print-jobs/:id 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/print-jobs/p1');
  expect(res.status).toBe(404);
});

test('GET /api/print-jobs/:id returns status', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ status: 'queued' }] });
  const res = await request(app).get('/api/print-jobs/p1');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('queued');
});
