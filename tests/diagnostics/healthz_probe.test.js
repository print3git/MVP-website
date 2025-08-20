const { startDevServer } = require("../../scripts/dev-server");

test("logs /healthz response", async () => {
  const server = startDevServer(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/healthz`);
  const body = await res.text();
  const headers = Object.fromEntries(res.headers.entries());
  console.log("/healthz headers", headers);
  console.log("/healthz body", body);
  await new Promise((resolve) => server.close(resolve));
  expect(true).toBe(true);
});
