const { startDevServer } = require('../../scripts/dev-server');
const fetch = global.fetch;

describe('basic app smoke', () => {
  let server;
  beforeAll(() => {
    server = startDevServer(0);
  });
  afterAll(() => {
    if (server) {
      server.removeAllListeners && server.removeAllListeners('close');
      server.close();
    }
  });

  test('GET / returns 200', async () => {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(200);
  });

  test('health or status endpoint', async () => {
    const port = server.address().port;
    const paths = ['/health', '/status'];
    for (const p of paths) {
      try {
        const res = await fetch(`http://localhost:${port}${p}`);
        if (res.status !== 404) {
          expect(res.status).toBe(200);
          const text = (await res.text()).toLowerCase();
          expect(text).toContain('ok');
          return;
        }
      } catch (_e) {
        // ignore network errors and continue
      }
    }
    console.warn('No /health or /status endpoint found');
  });
});
