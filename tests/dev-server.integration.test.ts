let startDevServer = null;
let hasExpress = true;
try {
  require.resolve("express");
  ({ startDevServer } = require("../scripts/dev-server"));
} catch {
  hasExpress = false;
}

test("express dependency installed", () => {
  expect(hasExpress).toBe(true);
});

jest.setTimeout(10000);

const integration = startDevServer ? test : test.skip;

integration("serves /healthz", async () => {
  const server = startDevServer(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/healthz`);
  expect(res.status).toBe(200);
  await new Promise((resolve) => server.close(resolve));
});

test("stubs /api/generate", async () => {
  const server = startDevServer(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/generate`, {
    method: "POST",
  });
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.glb_url).toBe("/models/bag.glb");
  await new Promise((resolve) => server.close(resolve));
});
