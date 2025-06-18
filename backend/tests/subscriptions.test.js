process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn().mockResolvedValue({}),
  upsertSubscription: jest.fn().mockResolvedValue({ id: 's1', status: 'active' }),
  cancelSubscription: jest.fn().mockResolvedValue({ id: 's1', status: 'canceled' }),
  getSubscription: jest.fn().mockResolvedValue({ id: 's1', status: 'active' }),
  ensureCurrentWeekCredits: jest.fn(),
  getCurrentWeekCredits: jest.fn().mockResolvedValue({ total_credits: 2, used_credits: 1 }),
  incrementCreditsUsed: jest.fn(),
  insertSubscriptionEvent: jest.fn(),
  getSubscriptionMetrics: jest.fn(),
}));
const db = require('../db');

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = { billingPortal: { sessions: { create: jest.fn() } } };
Stripe.mockImplementation(() => stripeMock);

const request = require('supertest');
const app = require('../server');
const jwt = require('jsonwebtoken');

beforeEach(() => {
  db.upsertSubscription.mockClear();
  db.cancelSubscription.mockClear();
  db.getSubscription.mockClear();
  db.ensureCurrentWeekCredits.mockClear();
  db.getCurrentWeekCredits.mockClear();
  db.insertSubscriptionEvent.mockClear();
  db.getSubscriptionMetrics.mockClear();
});

test('GET /api/subscription returns subscription', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/subscription').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('active');
});

test('POST /api/subscription creates record', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/subscription')
    .set('authorization', `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(200);
  expect(db.upsertSubscription).toHaveBeenCalled();
});

test('GET /api/subscription/credits returns remaining', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .get('/api/subscription/credits')
    .set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.remaining).toBe(1);
});

test('POST /api/subscription/portal returns url', async () => {
  db.getSubscription.mockResolvedValueOnce({ stripe_customer_id: 'cus_1' });
  stripeMock.billingPortal.sessions.create.mockResolvedValueOnce({ url: 'u' });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/subscription/portal')
    .set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.url).toBe('u');
  expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalled();
});

test('POST /api/subscription/portal 404 without customer', async () => {
  db.getSubscription.mockResolvedValueOnce(null);
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/subscription/portal')
    .set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test('GET /api/admin/subscription-metrics requires admin', async () => {
  const res = await request(app).get('/api/admin/subscription-metrics');
  expect(res.status).toBe(401);
});

test('GET /api/admin/subscription-metrics returns data', async () => {
  db.getSubscriptionMetrics.mockResolvedValueOnce({ active: 5, churn_last_30_days: 2 });
  const res = await request(app)
    .get('/api/admin/subscription-metrics')
    .set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body.active).toBe(5);
  expect(res.body.churn_last_30_days).toBe(2);
});
