const request = require('supertest');
const app = require('../server');

test('POST /generate returns image data', async () => {
  const res = await request(app).post('/generate').send({ prompt: 'test' });
  expect(res.status).toBe(200);
  expect(res.body.image).toMatch(/^data:image\/png;base64,/);
});

test('POST /generate requires prompt', async () => {
  const res = await request(app).post('/generate').send({});
  expect(res.status).toBe(400);
});
