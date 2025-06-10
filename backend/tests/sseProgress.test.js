/** @jest-environment node */
process.env.STRIPE_SECRET_KEY = 'test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec';
process.env.DB_URL = 'postgres://user:pass@localhost/db';
process.env.HUNYUAN_API_KEY = 'test';
process.env.HUNYUAN_SERVER_URL = 'http://localhost:4000';
const request = require('supertest');
const { progressEmitter } = require('../queue/printQueue');
const app = require('../server');

test('SSE progress endpoint streams updates', async () => {
  const req = request(app).get('/api/progress/job1');
  setTimeout(() => {
    progressEmitter.emit('progress', { jobId: 'job1', progress: 100 });
  }, 50);
  const res = await req;
  expect(res.text).toContain('data: {"jobId":"job1","progress":100}');
});
