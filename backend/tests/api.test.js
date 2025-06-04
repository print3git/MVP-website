process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));
const db = require('../db');

jest.mock('axios');
const axios = require('axios');

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  checkout: { sessions: { create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://stripe.test' }) } },
  webhooks: { constructEvent: jest.fn(() => ({ type: 'checkout.session.completed', data: { object: { id: 'cs_test', metadata: { jobId: 'job1' } } } })) }
};
Stripe.mockImplementation(() => stripeMock);

jest.mock('../queue/printQueue', () => ({ enqueuePrint: jest.fn() }));
const { enqueuePrint } = require('../queue/printQueue');

const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const stream = require('stream');

beforeEach(() => {
  db.query.mockClear();
  axios.post.mockClear();
  enqueuePrint.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('POST /api/generate returns glb url', async () => {
  axios.post.mockResolvedValue({ data: { glb_url: '/models/test.glb' } });
  const res = await request(app).post('/api/generate').send({ prompt: 'test' });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('/models/test.glb');
});

test('GET /api/status returns job', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1', status: 'complete', model_url: 'url' }] });
  const res = await request(app).get('/api/status/1');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('complete');
});

test('Stripe create-order flow', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1' }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app).post('/api/create-order').send({ jobId: '1', price: 100 });
  expect(res.status).toBe(200);
  expect(res.body.checkoutUrl).toBe('https://stripe.test');
});

test('Stripe webhook updates order and enqueues print', async () => {
  db.query.mockResolvedValueOnce({});
  const payload = JSON.stringify({});
  const res = await request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'sig')
    .set('Content-Type', 'application/json')
    .send(payload);
  expect(res.status).toBe(200);
  expect(enqueuePrint).toHaveBeenCalledWith('job1');
});

test('POST /api/generate accepts image upload', async () => {
  const chunks = [];
  jest
    .spyOn(fs, 'createWriteStream')
    .mockImplementation(() => {
      const writable = new stream.Writable({
        write(chunk, enc, cb) {
          chunks.push(chunk);
          cb();
        },
      });
      return writable;
    });

  jest
    .spyOn(fs, 'createReadStream')
    .mockImplementation(() => {
      const readable = new stream.Readable({
        read() {
          this.push(Buffer.concat(chunks));
          this.push(null);
        },
      });
      return readable;
    });

  jest.spyOn(fs, 'unlink').mockImplementation((_, cb) => cb && cb());

  axios.post.mockResolvedValue({ data: { glb_url: '/models/test.glb' } });
  const res = await request(app)
    .post('/api/generate')
    .field('prompt', 'img test')
    .attach('images', Buffer.from('fake'), 'test.png');

  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('/models/test.glb');

  const insertCall = db.query.mock.calls.find(c =>
    c[0].includes('INSERT INTO jobs')
  );
  expect(insertCall[1][2]).toEqual(expect.any(String));
});

test('GET /api/community returns models', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1', model_url: 'url1' }] });
  const res = await request(app).get('/api/community');
  expect(res.status).toBe(200);
  expect(res.body.models).toHaveLength(1);
});
