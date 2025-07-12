let startDevServer = null;
try {
  require.resolve("express");
  ({ startDevServer } = require("../scripts/dev-server"));
} catch {
  // Express is not installed; skip integration test
}

jest.setTimeout(10000);

const integration = startDevServer ? test : test.skip;

integration("serves /healthz", async () => {
  const server = startDevServer(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/healthz`);
  expect(res.status).toBe(200);
  await new Promise((resolve) => server.close(resolve));
});
