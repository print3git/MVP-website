process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertSubscriptionEvent: jest.fn(),
}));
const db = require('../db');

jest.mock('../mail', () => ({ sendTemplate: jest.fn() }));
const { sendTemplate } = require('../mail');

const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
  sendTemplate.mockClear();
});

/** Test request-password-reset endpoint */
test('POST /api/request-password-reset inserts record and sends email', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice' }] })
    .mockResolvedValueOnce({});

  const res = await request(app)
    .post('/api/request-password-reset')
    .set('origin', 'http://test.com')
    .send({ email: 'a@a.com' });

  expect(res.status).toBe(204);

  const insertCall = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO password_resets'));
  expect(insertCall).toBeTruthy();
  const token = insertCall[1][1];
  expect(sendTemplate).toHaveBeenCalledWith(
    'a@a.com',
    'Password Reset',
    'password_reset.txt',
    expect.objectContaining({ username: 'alice', reset_url: expect.stringContaining(token) })
  );
});

/** Test reset-password invalid token */
test('POST /api/reset-password rejects invalid token', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app)
    .post('/api/reset-password')
    .send({ token: 'bad', password: 'new' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Invalid token');
});

/** Test reset-password expired token */
test('POST /api/reset-password rejects expired token', async () => {
  const past = new Date(Date.now() - 1000).toISOString();
  db.query.mockResolvedValueOnce({ rows: [{ user_id: 'u1', expires_at: past }] });
  const res = await request(app).post('/api/reset-password').send({ token: 't', password: 'new' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Token expired');
});

/** Test reset-password success path */
test('POST /api/reset-password updates password and clears token', async () => {
  const future = new Date(Date.now() + 1000).toISOString();
  db.query
    .mockResolvedValueOnce({ rows: [{ user_id: 'u1', expires_at: future }] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});

  const res = await request(app)
    .post('/api/reset-password')
    .send({ token: 't1', password: 'secret' });

  expect(res.status).toBe(204);

  const updateCall = db.query.mock.calls.find((c) => c[0].includes('UPDATE users'));
  const hashed = updateCall[1][0];
  expect(await bcrypt.compare('secret', hashed)).toBe(true);
  expect(updateCall[1][1]).toBe('u1');

  const deleteCall = db.query.mock.calls.find((c) => c[0].includes('DELETE FROM password_resets'));
  expect(deleteCall[1][0]).toBe('t1');
});
