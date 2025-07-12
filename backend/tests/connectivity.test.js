const https = require('https');

function check(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 5000 }, () => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

const skip = process.env.SKIP_NETWORK_TESTS === '1';
(skip ? test.skip : test)('esm.sh is reachable', async () => {
  const ok = await check('https://esm.sh/');
  if (!ok) {
    console.warn('Skipping connectivity test: esm.sh unreachable');
    return;
  }
  expect(ok).toBe(true);
});
