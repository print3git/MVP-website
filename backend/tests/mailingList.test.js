process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  upsertMailingListEntry: jest.fn().mockResolvedValue({}),
  confirmMailingListEntry: jest.fn().mockResolvedValue({}),
  unsubscribeMailingListEntry: jest.fn().mockResolvedValue({}),
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertCommission: jest.fn().mockResolvedValue({}),
}));
const db = require('../db');

jest.mock('../mail', () => ({ sendMail: jest.fn() }));
const { sendMail } = require('../mail');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.upsertMailingListEntry.mockClear();
  db.unsubscribeMailingListEntry.mockClear();
  sendMail.mockClear();
});

test('POST /api/subscribe stores address and sends email', async () => {
  const res = await request(app).post('/api/subscribe').send({ email: 'a@a.com' });
  expect(res.status).toBe(204);
  expect(db.upsertMailingListEntry).toHaveBeenCalled();
  expect(sendMail).toHaveBeenCalledWith(
    'a@a.com',
    'Confirm Subscription',
    expect.stringContaining('/api/confirm-subscription?token=')
  );
});

test('GET /api/unsubscribe marks unsubscribed', async () => {
  const res = await request(app).get('/api/unsubscribe?token=t1');
  expect(res.text).toMatch(/unsubscribed/i);
  expect(db.unsubscribeMailingListEntry).toHaveBeenCalledWith('t1');
});
