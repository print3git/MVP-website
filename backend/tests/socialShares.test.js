process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
  insertSocialShare: jest.fn(),
  verifySocialShare: jest.fn(),
  getOrCreateOrderReferralLink: jest.fn(),
  insertReferredOrder: jest.fn(),
}));
const db = require('../db');

jest.mock('../discountCodes', () => ({
  createTimedCode: jest.fn().mockResolvedValue('DISC999'),
}));
const { createTimedCode } = require('../discountCodes');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  jest.clearAllMocks();
});

test('POST /api/social-shares stores submission', async () => {
  db.insertSocialShare.mockResolvedValue({ id: 1, verified: false });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/social-shares')
    .set('authorization', `Bearer ${token}`)
    .send({ orderId: 'o1', url: 'https://example.com/post' });
  expect(res.status).toBe(201);
  expect(res.body.id).toBe(1);
  expect(db.insertSocialShare).toHaveBeenCalledWith('u1', 'o1', 'https://example.com/post');
});

test('POST /api/admin/social-shares/:id/verify issues discount', async () => {
  db.verifySocialShare.mockResolvedValue({ user_id: 'u1' });
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post('/api/admin/social-shares/1/verify')
    .set('x-admin-token', 'admin');
  expect(res.status).toBe(200);
  expect(res.body.code).toBe('DISC999');
  expect(createTimedCode).toHaveBeenCalledWith(500, 168);
  expect(db.verifySocialShare).toHaveBeenCalledWith('1', 'DISC999');
});
