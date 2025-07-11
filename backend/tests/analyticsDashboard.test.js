process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('../db', () => ({
  getGenerationLogs: jest.fn(),
}));
const db = require('../db');
const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

test('requires admin token', async () => {
  const res = await request(app).get('/api/admin/analytics');
  expect(res.status).toBe(401);
});

test('returns logs', async () => {
  db.getGenerationLogs.mockResolvedValueOnce([{ id: 1 }]);
  const res = await request(app)
    .get('/api/admin/analytics')
    .set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body[0].id).toBe(1);
});
