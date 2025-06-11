process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn().mockResolvedValue({}),
}));
const db = require('../db');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
});

test('GET /api/commissions requires auth', async () => {
  const res = await request(app).get('/api/commissions');
  expect(res.status).toBe(401);
});

test('GET /api/commissions returns totals', async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { id: 'c1', commission_cents: 100, status: 'pending' },
      { id: 'c2', commission_cents: 50, status: 'paid' },
    ],
  });
  const token = jwt.sign({ id: 'seller' }, 'secret');
  const res = await request(app).get('/api/commissions').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.totalPending).toBe(100);
  expect(res.body.totalPaid).toBe(50);
  expect(res.body.commissions).toHaveLength(2);
});

test('POST /api/commissions/:id/mark-paid admin token required', async () => {
  const res = await request(app).post('/api/commissions/c1/mark-paid');
  expect(res.status).toBe(401);
});

test('POST /api/commissions/:id/mark-paid updates status', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', status: 'paid' }] });
  const res = await request(app)
    .post('/api/commissions/c1/mark-paid')
    .set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('paid');
  expect(db.query).toHaveBeenCalledWith(
    'UPDATE model_commissions SET status=$1 WHERE id=$2 RETURNING *',
    ['paid', 'c1']
  );
});
