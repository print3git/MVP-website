const { createServer } = require('../../utils/server');
const { modelFactory } = require('../../utils/factories');

jest.mock('pg', () => {
  const mClient = {
    query: jest.fn((_sql, params) => {
      const [prompt, url] = params;
      return Promise.resolve({ rows: [{ id: 1, prompt, url }] });
    }),
  };
  return { Pool: jest.fn(() => mClient) };
}, { virtual: true });

describe('POST /api/models', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.DB_ENDPOINT = 'postgres://test';
    process.env.DB_PASSWORD = 'pw';
    process.env.CLOUDFRONT_DOMAIN = 'cdn.example.com';
  });

  test('creates model with valid data', async () => {
    const server = createServer();
    const payload = modelFactory();
    const res = await server.post('/api/models').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.prompt).toBe(payload.prompt);
  }, 10000);

  test('rejects invalid payload', async () => {
    const server = createServer();
    const res = await server.post('/api/models').send({ prompt: '', fileKey: 'bad key?' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  }, 10000);
});
