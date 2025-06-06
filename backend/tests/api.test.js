process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
const db = require('../db');

jest.mock('axios');
const axios = require('axios');
const jwt = require('jsonwebtoken');

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://stripe.test' }),
    },
  },
  webhooks: {
    constructEvent: jest.fn(() => ({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test', metadata: { jobId: 'job1' } } },
    })),
  },
};
Stripe.mockImplementation(() => stripeMock);

jest.mock('../queue/printQueue', () => ({
  enqueuePrint: jest.fn(),
  processQueue: jest.fn(),
}));
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
  db.query.mockResolvedValueOnce({
    rows: [{ job_id: '1', status: 'complete', model_url: 'url' }],
  });
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

test('create-order applies discount', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1' }] });
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post('/api/create-order')
    .send({ jobId: '1', price: 100, qty: 2, discount: 20 });
  expect(res.status).toBe(200);
  expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      line_items: [
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 180 }),
        }),
      ],
    })
  );
  const insertCall = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO orders'));
  expect(insertCall[1][3]).toBe(180);
  expect(insertCall[1][7]).toBe(20);
});

test('create-order rejects unknown job', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).post('/api/create-order').send({ jobId: 'bad' });
  expect(res.status).toBe(404);
});

test('POST /api/register returns token', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 'u1', username: 'alice' }] });
  const res = await request(app)
    .post('/api/register')
    .send({ username: 'alice', email: 'a@a.com', password: 'p' });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
});

const bcrypt = require('bcryptjs');

test('POST /api/login returns token', async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', username: 'alice', password_hash: bcrypt.hashSync('p', 10) }],
  });
  const res = await request(app).post('/api/login').send({ username: 'alice', password: 'p' });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
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

test('Stripe webhook invalid signature', async () => {
  stripeMock.webhooks.constructEvent.mockImplementation(() => {
    throw new Error('bad sig');
  });
  const payload = JSON.stringify({});
  const res = await request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'bad')
    .set('Content-Type', 'application/json')
    .send(payload);
  expect(res.status).toBe(400);
});

test('Stripe webhook invalid signature does not process', async () => {
  stripeMock.webhooks.constructEvent.mockImplementation(() => {
    throw new Error('bad sig');
  });
  const payload = JSON.stringify({});
  await request(app)
    .post('/api/webhook/stripe')
    .set('stripe-signature', 'bad')
    .set('Content-Type', 'application/json')
    .send(payload);
  expect(db.query).not.toHaveBeenCalled();
  expect(enqueuePrint).not.toHaveBeenCalled();
});

test('POST /api/generate accepts image upload', async () => {
  const chunks = [];
  jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
    const writable = new stream.Writable({
      write(chunk, enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    return writable;
  });

  jest.spyOn(fs, 'createReadStream').mockImplementation(() => {
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

  const insertCall = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO jobs'));
  expect(insertCall[1][2]).toEqual(expect.any(String));
});

test('POST /api/community submits model', async () => {
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/community')
    .set('authorization', `Bearer ${token}`)
    .send({ jobId: 'j1' });
  expect(res.status).toBe(201);
});

test('POST /api/community requires jobId', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/community')
    .set('authorization', `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(400);
});

test('POST /api/community requires auth', async () => {
  const res = await request(app).post('/api/community').send({ jobId: 'j1' });
  expect(res.status).toBe(401);
});

test('POST /api/community unauthorized skips DB', async () => {
  await request(app).post('/api/community').send({ jobId: 'j1' });
  expect(db.query).not.toHaveBeenCalled();
});

test('GET /api/community/recent returns creations', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/community/recent');
  expect(res.status).toBe(200);
});

test('GET /api/community/recent supports order', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/community/recent?order=asc');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY c.created_at ASC'), [
    10,
    0,
    null,
    null,
  ]);
});

test('GET /api/community/recent pagination and category', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/community/recent?limit=5&offset=2&category=art&search=bot');
  expect(db.query).toHaveBeenCalledWith(expect.any(String), [5, 2, 'art', 'bot']);
});

test('Admin create competition', async () => {
  db.query.mockResolvedValueOnce({ rows: [{}] });
  const res = await request(app)
    .post('/api/admin/competitions')
    .set('x-admin-token', 'admin')
    .send({ name: 'Test', start_date: '2025-01-01', end_date: '2025-01-31' });
  expect(res.status).toBe(200);
});

test('Admin create competition unauthorized', async () => {
  const res = await request(app)
    .post('/api/admin/competitions')
    .send({ name: 'Test', start_date: '2025-01-01', end_date: '2025-01-31' });
  expect(res.status).toBe(401);
});

test('registration missing username', async () => {
  const res = await request(app).post('/api/register').send({ email: 'a@a.com', password: 'p' });
  expect(res.status).toBe(400);
});

test('registration missing email', async () => {
  const res = await request(app).post('/api/register').send({ username: 'a', password: 'p' });
  expect(res.status).toBe(400);
});

test('registration missing password', async () => {
  const res = await request(app).post('/api/register').send({ username: 'a', email: 'a@a.com' });
  expect(res.status).toBe(400);
});

test('registration duplicate username', async () => {
  db.query.mockRejectedValueOnce(new Error('duplicate key'));
  const res = await request(app)
    .post('/api/register')
    .send({ username: 'a', email: 'a@a.com', password: 'p' });
  expect(res.status).toBe(500);
});

test('login invalid password', async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ id: 'u1', username: 'alice', password_hash: bcrypt.hashSync('p', 10) }],
  });
  const res = await request(app).post('/api/login').send({ username: 'alice', password: 'wrong' });
  expect(res.status).toBe(401);
});

test('login missing fields', async () => {
  const res = await request(app).post('/api/login').send({ username: '' });
  expect(res.status).toBe(400);
});

test('/api/generate 400 when no prompt or image', async () => {
  const res = await request(app).post('/api/generate').send({});
  expect(res.status).toBe(400);
});

test('/api/generate falls back on server failure', async () => {
  axios.post.mockRejectedValueOnce(new Error('fail'));
  const res = await request(app).post('/api/generate').send({ prompt: 't' });
  expect(res.status).toBe(200);
  expect(res.body.glb_url).toBe('https://modelviewer.dev/shared-assets/models/Astronaut.glb');
});

test('/api/generate saves authenticated user id', async () => {
  axios.post.mockResolvedValueOnce({ data: { glb_url: '/m.glb' } });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  await request(app)
    .post('/api/generate')
    .set('authorization', `Bearer ${token}`)
    .send({ prompt: 't' });
  const insertCall = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO jobs'));
  expect(insertCall[1][4]).toBe('u1');
});

test('/api/status supports limit and offset', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/status?limit=5&offset=2');
  expect(db.query).toHaveBeenCalledWith(
    'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [5, 2]
  );
});

test('/api/status/:id returns 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/status/bad');
  expect(res.status).toBe(404);
});

test('GET /api/users/:username/profile returns profile', async () => {
  db.query.mockResolvedValueOnce({
    rows: [{ display_name: 'Alice', avatar_url: 'a.png' }],
  });
  const res = await request(app).get('/api/users/alice/profile');
  expect(res.status).toBe(200);
  expect(res.body.display_name).toBe('Alice');
  expect(res.body.avatar_url).toBe('a.png');
});

test('GET /api/users/:username/profile 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/users/none/profile');
  expect(res.status).toBe(404);
});

test('GET /api/profile returns profile', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  db.query.mockResolvedValueOnce({
    rows: [{ user_id: 'u1', shipping_info: {}, payment_info: {} }],
  });
  const res = await request(app).get('/api/profile').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.user_id).toBe('u1');
});

test('POST /api/profile saves details', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  db.query.mockResolvedValueOnce({});
  const res = await request(app)
    .post('/api/profile')
    .set('authorization', `Bearer ${token}`)
    .send({ shippingInfo: { a: 1 }, paymentInfo: { b: 2 } });
  expect(res.status).toBe(204);
  const call = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO user_profiles'));
  expect(call).toBeTruthy();
});

test('POST /api/create-order saves user id', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: '1' }] });
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  await request(app)
    .post('/api/create-order')
    .set('authorization', `Bearer ${token}`)
    .send({ jobId: '1', price: 100 });
  const call = db.query.mock.calls.find((c) => c[0].includes('INSERT INTO orders'));
  expect(call[1][2]).toBe('u1');
});

test('GET /api/my/orders returns orders', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ session_id: 's1' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/my/orders').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body[0].session_id).toBe('s1');
});

test('GET /api/my/orders requires auth', async () => {
  const res = await request(app).get('/api/my/orders');
  expect(res.status).toBe(401);
});
