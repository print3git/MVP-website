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
  const body = await res.json();
  const healthy = body && (body.status === "ok" || body.ok === true);
  if (body && body.ok === true && body.status !== "ok") {
    console.warn("/healthz { ok: true } is deprecated; prefer { status: 'ok' }");
  }
  // TODO: remove legacy { ok: true } support after 2025-08-27
  expect(res.status).toBe(200);
  expect(healthy).toBe(true);
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
