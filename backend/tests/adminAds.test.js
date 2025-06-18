process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.DALLE_API_URL = 'http://localhost:5002/generate';
process.env.LLM_API_URL = '';
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('axios');
const axios = require('axios');
axios.post.mockResolvedValue({ data: { image: 'imgdata' } });

const fs = require('fs');
const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

const app = require('../server');

beforeEach(() => {
  axios.post.mockClear();
  writeSpy.mockClear();
});

test('POST /api/admin/ads/generate returns ad', async () => {
  const res = await require('supertest')(app)
    .post('/api/admin/ads/generate')
    .set('x-admin-token', 'admin')
    .send({ subreddit: 'test' });
  expect(res.status).toBe(200);
  expect(res.body.subreddit).toBe('test');
});

test('Ad approval updates status', async () => {
  const req = require('supertest')(app);
  const gen = await req
    .post('/api/admin/ads/generate')
    .set('x-admin-token', 'admin')
    .send({ subreddit: 'test' });
  const id = gen.body.id;
  const approve = await req.post(`/api/admin/ads/${id}/approve`).set('x-admin-token', 'admin');
  expect(approve.status).toBe(200);
  expect(approve.body.status).toBe('approved');
});
