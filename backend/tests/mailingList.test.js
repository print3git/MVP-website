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
  db.confirmMailingListEntry.mockClear();
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

test('GET /api/confirm-subscription confirms address', async () => {
  const res = await request(app).get('/api/confirm-subscription?token=tok1');
  expect(res.text).toMatch(/confirm/i);
  expect(db.confirmMailingListEntry).toHaveBeenCalledWith('tok1');
});

test('POST /api/webhook/sendgrid handles bounce', async () => {
  await request(app)
    .post('/api/webhook/sendgrid')
    .send([{ event: 'bounce', email: 'a@a.com' }]);
  expect(db.query).toHaveBeenCalledWith(
    'UPDATE mailing_list SET unsubscribed=TRUE WHERE email=$1',
    ['a@a.com']
  );
});
