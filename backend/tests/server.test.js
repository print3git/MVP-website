const request = require('supertest');
const app = require('../server');

describe('POST /api/generate', () => {
  it('returns 400 when body is empty', async () => {
    const response = await request(app).post('/api/generate').send({});
    expect(response.status).toBe(400);
  });
});
