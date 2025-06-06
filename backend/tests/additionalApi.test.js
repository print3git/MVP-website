process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';

jest.mock('../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));
const db = require('../db');

jest.mock('../mail', () => ({ sendMail: jest.fn() }));
const { sendMail } = require('../mail');

jest.mock('axios');
const axios = require('axios');
const jwt = require('jsonwebtoken');

jest.mock('stripe');
const Stripe = require('stripe');
const stripeMock = {
  checkout: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn(() => ({ type: 'noop' })) },
};
Stripe.mockImplementation(() => stripeMock);

const { progressEmitter } = require('../queue/dbPrintQueue');

const request = require('supertest');
const app = require('../server');

beforeEach(() => {
  db.query.mockClear();
  axios.post.mockClear();
  sendMail.mockClear();
  stripeMock.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test',
    url: 'https://stripe.test',
  });
});

test('GET /api/my/models returns models', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ job_id: 'j1' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/my/models').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body[0].job_id).toBe('j1');
});

test('GET /api/my/models requires auth', async () => {
  const res = await request(app).get('/api/my/models');
  expect(res.status).toBe(401);
});

test('GET /api/my/models ordered by date', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  await request(app).get('/api/my/models').set('authorization', `Bearer ${token}`);
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'), [
    'u1',
    10,
    0,
  ]);
});

test('GET /api/my/models supports pagination', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  await request(app).get('/api/my/models?limit=5&offset=2').set('authorization', `Bearer ${token}`);
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY created_at DESC'), [
    'u1',
    5,
    2,
  ]);
});

test('GET /api/my/models returns models sorted by date', async () => {
  const rows = [
    { job_id: 'j2', created_at: '2024-01-02' },
    { job_id: 'j1', created_at: '2024-01-01' },
  ];
  db.query.mockResolvedValueOnce({ rows });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/my/models').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.map((r) => r.job_id)).toEqual(['j2', 'j1']);
});

test('GET /api/profile returns profile', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ display_name: 'A' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/profile').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.display_name).toBe('A');
});

test('GET /api/profile 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).get('/api/profile').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test('GET /api/users/:username/models returns models', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ id: 'u1' }] })
    .mockResolvedValueOnce({ rows: [{ job_id: 'j1', likes: 0 }] });
  const res = await request(app).get('/api/users/alice/models');
  expect(res.status).toBe(200);
  expect(res.body[0].job_id).toBe('j1');
  const call = db.query.mock.calls.find((c) => c[0].includes('FROM jobs'));
  expect(call[0]).toContain('j.is_public=TRUE');
  expect(call[1]).toEqual(['u1', 10, 0]);
});

test('GET /api/users/:username/models supports pagination', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 'u1' }] }).mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/users/alice/models?limit=3&offset=1');
  const call = db.query.mock.calls.find((c) => c[0].includes('FROM jobs'));
  expect(call[1]).toEqual(['u1', 3, 1]);
});

test('GET /api/users/:username/models 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/users/missing/models');
  expect(res.status).toBe(404);
});

test('POST /api/models/:id/like adds like', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: '1' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/models/j1/like')
    .set('authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.likes).toBe(1);
});

test('POST /api/models/:id/like removes like', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{}] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({ rows: [{ count: '0' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/models/j1/like')
    .set('authorization', `Bearer ${token}`)
    .send();
  expect(res.status).toBe(200);
  expect(res.body.likes).toBe(0);
});

test('POST /api/models/:id/like requires auth', async () => {
  const res = await request(app).post('/api/models/j1/like').send();
  expect(res.status).toBe(401);
});

test('POST /api/models/:id/public updates flag', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ is_public: true }] });

  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/models/j1/public')
    .set('authorization', `Bearer ${token}`)
    .send({ isPublic: true });
  expect(res.status).toBe(200);
  expect(res.body.is_public).toBe(true);
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE jobs SET is_public'), [
    true,
    'j1',
    'u1',
  ]);
});

test('POST /api/models/:id/public requires boolean', async () => {
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/models/j1/public')
    .set('authorization', `Bearer ${token}`)
    .send({});
  expect(res.status).toBe(400);
});

test('DELETE /api/models/:id deletes model', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ job_id: 'j1' }] })
    .mockResolvedValueOnce({})
    .mockResolvedValueOnce({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).delete('/api/models/j1').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(204);
  const call = db.query.mock.calls[0][0];
  expect(call).toContain('DELETE FROM jobs');
});

test('DELETE /api/models/:id 404 when missing', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app).delete('/api/models/bad').set('authorization', `Bearer ${token}`);
  expect(res.status).toBe(404);
});

test('GET /api/community/recent pagination and category', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });

  await request(app).get('/api/community/recent?limit=5&offset=2&category=art');
  expect(db.query).toHaveBeenCalledWith(expect.any(String), [5, 2, 'art', null]);
});

test('GET /api/community/popular uses correct ordering', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/community/popular?limit=1&offset=0');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('likes DESC, c.created_at DESC'), [
    1,
    0,
    null,
    null,
  ]);
});

test('GET /api/competitions/active', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/competitions/active');
  expect(res.status).toBe(200);
});

test('GET /api/competitions/active upcoming', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/competitions/active');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('end_date >= CURRENT_DATE'));
});

test('GET /api/competitions/active returns upcoming comps', async () => {
  const upcoming = {
    id: '1',
    name: 'Future Event',
    start_date: '2099-01-01',
    end_date: '2099-01-31',
  };
  db.query.mockResolvedValueOnce({ rows: [upcoming] });
  const res = await request(app).get('/api/competitions/active');
  expect(res.status).toBe(200);
  expect(res.body[0].id).toBe('1');
  expect(res.body[0].start_date).toBe('2099-01-01');
});

test('GET /api/competitions/past', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).get('/api/competitions/past');
  expect(res.status).toBe(200);
});

test('GET /api/competitions/past ordering', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/competitions/past');
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining('ORDER BY c.end_date DESC LIMIT 5')
  );
});

test('GET /api/competitions/:id/entries', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ model_id: 'm1', likes: 3 }] });
  const res = await request(app).get('/api/competitions/5/entries');
  expect(res.status).toBe(200);
  expect(res.body[0].likes).toBe(3);
});

test('GET /api/competitions/:id/entries order', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await request(app).get('/api/competitions/5/entries');
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY likes DESC'), ['5']);
});

test('GET /api/competitions/:id/entries leaderboard order', async () => {
  db.query.mockResolvedValueOnce({
    rows: [
      { model_id: 'm2', likes: 10 },
      { model_id: 'm1', likes: 5 },
      { model_id: 'm3', likes: 1 },
    ],
  });
  const res = await request(app).get('/api/competitions/5/entries');
  expect(res.status).toBe(200);
  expect(res.body.map((e) => e.likes)).toEqual([10, 5, 1]);
});

test('GET /api/competitions/:id/comments', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', text: 'hi' }] });
  const res = await request(app).get('/api/competitions/5/comments');
  expect(res.status).toBe(200);
  expect(res.body[0].text).toBe('hi');
});

test('POST /api/competitions/:id/comments requires auth', async () => {
  const res = await request(app).post('/api/competitions/5/comments').send({ text: 'hey' });
  expect(res.status).toBe(401);
});

test('POST /api/competitions/:id/comments', async () => {
  db.query.mockResolvedValueOnce({ rows: [{ id: 'c1', text: 'hello' }] });
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/competitions/5/comments')
    .set('authorization', `Bearer ${token}`)
    .send({ text: 'hello' });
  expect(res.status).toBe(201);
  expect(res.body.text).toBe('hello');
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining('INSERT INTO competition_comments'),
    ['5', 'u1', 'hello']
  );
});

test('POST /api/competitions/:id/enter', async () => {
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const res = await request(app)
    .post('/api/competitions/5/enter')
    .set('authorization', `Bearer ${token}`)
    .send({ modelId: 'm1' });
  expect(res.status).toBe(201);
});

test('POST /api/competitions/:id/enter requires auth', async () => {
  const res = await request(app).post('/api/competitions/5/enter').send({ modelId: 'm1' });
  expect(res.status).toBe(401);
});

test('POST /api/competitions/:id/enter rejects unauthenticated user', async () => {
  const res = await request(app).post('/api/competitions/5/enter').send({ modelId: 'm1' });
  expect(res.status).toBe(401);
  expect(res.body.error).toBe('Unauthorized');
});

test('POST /api/competitions/:id/enter prevents duplicate', async () => {
  db.query.mockResolvedValueOnce({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  await request(app)
    .post('/api/competitions/5/enter')
    .set('authorization', `Bearer ${token}`)
    .send({ modelId: 'm1' });
  expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'), [
    '5',
    'm1',
    'u1',
  ]);
});

test('POST /api/competitions/:id/enter allows repeat submission without error', async () => {
  db.query.mockResolvedValue({});
  const token = jwt.sign({ id: 'u1' }, 'secret');
  const first = await request(app)
    .post('/api/competitions/5/enter')
    .set('authorization', `Bearer ${token}`)
    .send({ modelId: 'm1' });
  expect(first.status).toBe(201);
  const second = await request(app)
    .post('/api/competitions/5/enter')
    .set('authorization', `Bearer ${token}`)
    .send({ modelId: 'm1' });
  expect(second.status).toBe(201);
  expect(db.query).toHaveBeenCalledTimes(2);
  expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining('ON CONFLICT DO NOTHING'), [
    '5',
    'm1',
    'u1',
  ]);
});

test('DELETE /api/admin/competitions/:id', async () => {
  db.query.mockResolvedValueOnce({});
  const res = await request(app).delete('/api/admin/competitions/5').set('x-admin-token', 'admin');
  expect(res.status).toBe(204);
});

test('POST /api/admin/competitions unauthorized', async () => {
  const res = await request(app)
    .post('/api/admin/competitions')
    .send({ name: 'Test', start_date: '2025-01-01', end_date: '2025-01-31' });
  expect(res.status).toBe(401);
});

test('SSE progress endpoint streams updates', async () => {
  const req = request(app).get('/api/progress/job1');
  setTimeout(() => {
    progressEmitter.emit('progress', { jobId: 'job1', progress: 100 });
  }, 50);
  const res = await req;
  expect(res.text).toContain('data: {"jobId":"job1","progress":100}');
});

test('POST /api/create-order rejects unknown job', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const res = await request(app).post('/api/create-order').send({ jobId: 'bad' });
  expect(res.status).toBe(404);
});

test('GET /api/shared/:slug returns data', async () => {
  db.getShareBySlug = jest.fn().mockResolvedValue({ job_id: 'j1', slug: 's1' });
  db.query.mockResolvedValueOnce({ rows: [{ prompt: 'p', model_url: '/m.glb' }] });
  const res = await request(app).get('/api/shared/s1');
  expect(res.status).toBe(200);
  expect(res.body.model_url).toBe('/m.glb');
});

test('GET /api/shared/:slug 404 when missing', async () => {
  db.getShareBySlug = jest.fn().mockResolvedValue(null);
  const res = await request(app).get('/api/shared/bad');
  expect(res.status).toBe(404);
});

test('POST /api/admin/competitions sends emails', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Comp' }] })
    .mockResolvedValueOnce({ rows: [{ email: 'a@a.com' }, { email: 'b@b.com' }] });
  const res = await request(app)
    .post('/api/admin/competitions')
    .set('x-admin-token', 'admin')
    .send({ name: 'Comp', start_date: '2025-01-01', end_date: '2025-01-31' });
  expect(res.status).toBe(200);
  expect(sendMail).toHaveBeenCalledTimes(2);
});

test('checkCompetitionStart sends voting emails', async () => {
  db.query
    .mockResolvedValueOnce({ rows: [{ id: 'c1', name: 'Comp' }] })
    .mockResolvedValueOnce({ rows: [{ email: 'a@a.com' }] })
    .mockResolvedValueOnce({});
  await app.checkCompetitionStart();
  expect(sendMail).toHaveBeenCalledWith('a@a.com', 'Voting Open', expect.stringContaining('Comp'));
  const call = db.query.mock.calls.find((c) => c[0].includes('UPDATE competitions'));
  expect(call[1][0]).toBe('c1');
});
