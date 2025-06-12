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

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  transfers: { create: jest.fn() },
  accounts: { create: jest.fn() },
  accountLinks: { create: jest.fn() },
};
Stripe.mockImplementation(() => stripeMock);

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
  stripeMock.transfers.create.mockReset();
  stripeMock.accounts.create.mockReset();
  stripeMock.accountLinks.create.mockReset();
});

test('POST /api/payouts requires auth', async () => {
  const res = await request(app).post('/api/payouts');
  expect(res.status).toBe(401);
});

test('POST /api/payouts 400 without account', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ stripe_account_id: null }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).post('/api/payouts').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(400);
});

test('POST /api/payouts transfers funds', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ stripe_account_id: 'acct_1' }] })
    .mockResolvedValueOnce({ rows: [{ commission_cents: 100 }, { commission_cents: 50 }] })
    .mockResolvedValueOnce({});
  stripeMock.transfers.create.mockResolvedValue({ id: 'tr_1' });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).post('/api/payouts').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.totalPaid).toBe(150);
  expect(stripeMock.transfers.create).toHaveBeenCalledWith({
    amount: 150,
    currency: 'usd',
    destination: 'acct_1',
    description: 'Commission payout',
  });
  const call = db.query.mock.calls.find((c) => c[0].includes('UPDATE model_commissions'));
  expect(call[1]).toEqual(['u1']);
});

test('POST /api/stripe/connect creates link', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ stripe_account_id: null }] })
    .mockResolvedValueOnce({ rows: [{ email: 'a@b.com' }] })
    .mockResolvedValueOnce({});
  stripeMock.accounts.create.mockResolvedValue({ id: 'acct_2' });
  stripeMock.accountLinks.create.mockResolvedValue({ url: 'https://connect' });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/stripe/connect')
    .set('authorization', `Bearer ${token}`)
    .set('origin', 'http://localhost');
  expect(res.status).toBe(200);
  expect(res.body.url).toBe('https://connect');
});
