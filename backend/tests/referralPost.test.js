process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../social', () => ({ verifyTag: jest.fn() }));
const { verifyTag } = require('../social');

jest.mock('../discountCodes', () => ({
  createTimedCode: jest.fn().mockResolvedValue('DISC1'),
}));
const { createTimedCode } = require('../discountCodes');

const app = require('../server');

test('POST /api/referral-post returns code when verified', async () => {
  verifyTag.mockResolvedValue(true);
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/referral-post')
    .set('authorization', `Bearer ${token}`)
    .send({ url: 'http://example.com/post' });
  expect(res.status).toBe(200);
  expect(res.body.code).toBe('DISC1');
  expect(createTimedCode).toHaveBeenCalledWith(500, 168);
});

test('POST /api/referral-post rejects invalid tag', async () => {
  verifyTag.mockResolvedValue(false);
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/referral-post')
    .set('authorization', `Bearer ${token}`)
    .send({ url: 'http://example.com/post' });
  expect(res.status).toBe(400);
});
