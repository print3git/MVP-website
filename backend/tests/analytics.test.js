process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

process.env.DB_URL = 'postgres://user:pass@localhost/db';

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
  db.insertAdClick.mockClear();
  db.insertCartEvent.mockClear();
  db.insertCheckoutEvent.mockClear();
  db.getConversionMetrics.mockClear();
});

test('POST /api/track/ad-click records click', async () => {
  const res = await request(app)
    .post('/api/track/ad-click')
    .send({ subreddit: '3dprinting', sessionId: 's1' });
  expect(res.status).toBe(200);
  expect(db.insertAdClick).toHaveBeenCalledWith('3dprinting', 's1');
});

test('POST /api/track/cart records event', async () => {
  const res = await request(app)
    .post('/api/track/cart')
    .send({ sessionId: 's1', modelId: 'm1', subreddit: '3dprinting' });
  expect(res.status).toBe(200);
  expect(db.insertCartEvent).toHaveBeenCalledWith('s1', 'm1', '3dprinting');
});

test('POST /api/track/checkout records event', async () => {
  const res = await request(app)
    .post('/api/track/checkout')
    .send({ sessionId: 's1', step: 'start', subreddit: '3dprinting' });
  expect(res.status).toBe(200);
  expect(db.insertCheckoutEvent).toHaveBeenCalledWith('s1', '3dprinting', 'start');
});

test('GET /api/metrics/conversion returns metrics', async () => {
  db.getConversionMetrics.mockResolvedValueOnce([{ subreddit: '3dprinting', ctr: 0.1 }]);
  const res = await request(app).get('/api/metrics/conversion');
  expect(res.status).toBe(200);
  expect(res.body[0].subreddit).toBe('3dprinting');
});
