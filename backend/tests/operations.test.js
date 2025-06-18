process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn(),
  insertCommission: jest.fn(),
  getOperationsMetrics: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
}));
const db = require('../db');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.getOperationsMetrics.mockClear();
});

test('GET /api/admin/operations requires admin', async () => {
  const res = await request(app).get('/api/admin/operations');
  expect(res.status).toBe(401);
});

test('GET /api/admin/operations returns data', async () => {
  db.getOperationsMetrics.mockResolvedValueOnce({ backlog: 3, errors: [] });
  const res = await request(app).get('/api/admin/operations').set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body.hubs[0].backlog).toBe(3);
});
