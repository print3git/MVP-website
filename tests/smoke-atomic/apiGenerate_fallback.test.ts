import http from 'http';

jest.mock('../../backend/src/pipeline/generateModel', () => ({
  generateModel: jest.fn().mockRejectedValue(new Error('offline')),
}));

const app = require('../../backend/server');

test('POST /api/generate returns fallback when externals fail', async () => {
  process.env.CI_REQUIRE_EXTERNAL = '0';
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as any;
  const res = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'test' }),
  });
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(typeof body.glb_url).toBe('string');
  expect(body.fallback).toBe(true);
  expect(body.reason).toBe('external_unavailable');
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
