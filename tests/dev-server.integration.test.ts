let hasExpress = true;
try {
  require.resolve("express");
} catch {
  hasExpress = false;
}

test("express dependency installed", () => {
  expect(hasExpress).toBe(true);
});

jest.setTimeout(10000);

const integration = hasExpress ? test : test.skip;

integration("serves /healthz", async () => {
  const res = await fetch(`${(globalThis as any).__TEST_BASE_URL__}/healthz`);
  expect(res.status).toBe(200);
});

test("stubs /api/generate", async () => {
  const res = await fetch(
    `${(globalThis as any).__TEST_BASE_URL__}/api/generate`,
    { method: "POST" },
  );
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(body.glb_url).toBe("/models/bag.glb");
});
