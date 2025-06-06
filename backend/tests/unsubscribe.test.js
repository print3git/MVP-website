process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');

jest.mock('stripe');
const Stripe = require('stripe');
Stripe.mockImplementation(() => ({ checkout: { sessions: { create: jest.fn() } }, webhooks: { constructEvent: jest.fn(() => ({})) } }));

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
});

test('GET /api/unsubscribe marks unsubscribed', async () => {
  db.query.mockResolvedValueOnce({ rowCount: 1 });
  const res = await request(app).get('/api/unsubscribe?token=t1');
  expect(res.status).toBe(200);
  expect(db.query).toHaveBeenCalledWith(
    'UPDATE mailing_list SET unsubscribed=TRUE WHERE token=$1',
    ['t1']
  );
});

test('GET /api/unsubscribe missing token', async () => {
  const res = await request(app).get('/api/unsubscribe');
  expect(res.status).toBe(400);
});
