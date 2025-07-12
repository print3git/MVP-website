const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');
const axios = require('axios');

describe('dev server', () => {
  const port = 3100;
  const url = `http://localhost:${port}`;
  let proc;

  const script = path.join(__dirname, '..', '..', 'scripts', 'dev-server.js');
  beforeAll(async () => {
    proc = spawn('node', [script], {
      env: { ...process.env, PORT: port },
      stdio: 'ignore',
    });
    await waitOn({ resources: [url], timeout: 10000 });
  });

  afterAll(() => {
    if (proc) proc.kill();
  });

  test('serves index at root', async () => {
    const res = await axios.head(url, { validateStatus: () => true });
    expect(res.status).toBe(200);
  });
});
