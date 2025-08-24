import request from 'supertest';
import app from '../../server';

describe('/api/generate-model removal', () => {
  test('POST without body returns 410', async () => {
    const res = await request(app).post('/api/generate-model');
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'removed' });
  });

  test('POST with body returns 410', async () => {
    const res = await request(app)
      .post('/api/generate-model')
      .send({ prompt: 'hi' });
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'removed' });
  });

  test('GET returns 410', async () => {
    const res = await request(app).get('/api/generate-model');
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ error: 'removed' });
  });
});
