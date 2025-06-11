process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn(),
  insertCommission: jest.fn(),
  getCommissionsForSeller: jest.fn(),
  markCommissionPaid: jest.fn(),
}));
const db = require('../db');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockReset();
  db.getCommissionsForSeller.mockReset();
  db.markCommissionPaid.mockReset();
});

test('GET /api/commissions returns commissions and totals', async () => {
  db.getCommissionsForSeller.mockResolvedValueOnce([
    { id: 'c1', commission_cents: 50, status: 'pending' },
  ]);
  db.query.mockResolvedValueOnce({ rows: [{ pending: 50, paid: 0 }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/commissions').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.commissions[0].id).toBe('c1');
  expect(res.body.totalPending).toBe(50);
  expect(res.body.totalPaid).toBe(0);
});

test('GET /api/commissions requires auth', async () => {
  const res = await request(app).get('/api/commissions');
  expect(res.status).toBe(401);
});

test('POST /api/commissions/:id/mark-paid updates status', async () => {
  db.markCommissionPaid.mockResolvedValueOnce({ id: 'c1', status: 'paid' });
  const res = await request(app)
    .post('/api/commissions/c1/mark-paid')
    .set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('paid');
});

test('POST /api/commissions/:id/mark-paid unauthorized', async () => {
  const res = await request(app).post('/api/commissions/c1/mark-paid');
  expect(res.status).toBe(401);
});
