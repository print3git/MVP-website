process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn(),
  insertCommission: jest.fn(),
  insertAdClick: jest.fn(),
  insertCartEvent: jest.fn(),
  insertCheckoutEvent: jest.fn(),
  getConversionMetrics: jest.fn(),
}));
const db = require('../db');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

test('POST /api/track/ad-click records click', async () => {
  const res = await request(app)
    .post('/api/track/ad-click')
    .send({ subreddit: 'funny', sessionId: 's1' });
  expect(res.status).toBe(200);
  expect(db.insertAdClick).toHaveBeenCalledWith('funny', 's1');
});

test('POST /api/track/cart records cart event', async () => {
  const res = await request(app)
    .post('/api/track/cart')
    .send({ sessionId: 's1', modelId: 'm1', subreddit: 'funny' });
  expect(res.status).toBe(200);
  expect(db.insertCartEvent).toHaveBeenCalledWith('s1', 'm1', 'funny');
});

test('POST /api/track/checkout records step', async () => {
  const res = await request(app)
    .post('/api/track/checkout')
    .send({ sessionId: 's1', subreddit: 'funny', step: 'start' });
  expect(res.status).toBe(200);
  expect(db.insertCheckoutEvent).toHaveBeenCalledWith('s1', 'funny', 'start');
});

test('GET /api/metrics/conversion returns metrics', async () => {
  db.getConversionMetrics.mockResolvedValue([{ subreddit: 'funny', atcRate: 0.5 }]);
  const res = await request(app).get('/api/metrics/conversion');
  expect(res.status).toBe(200);
  expect(res.body[0].subreddit).toBe('funny');
  expect(db.getConversionMetrics).toHaveBeenCalled();
});
