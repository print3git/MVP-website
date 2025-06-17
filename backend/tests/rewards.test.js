process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn(),
  getOrCreateReferralLink: jest.fn(),
  getRewardPoints: jest.fn(),
}));
const db = require('../db');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

test('GET /api/referral-link returns code', async () => {
  db.getOrCreateReferralLink.mockResolvedValue('abc123');
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/referral-link').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.code).toBe('abc123');
  expect(db.getOrCreateReferralLink).toHaveBeenCalledWith('u1');
});

test('GET /api/rewards returns points', async () => {
  db.getRewardPoints.mockResolvedValue(42);
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/rewards').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.points).toBe(42);
  expect(db.getRewardPoints).toHaveBeenCalledWith('u1');
});
