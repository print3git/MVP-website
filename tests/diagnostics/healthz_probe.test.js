test("logs /healthz response", async () => {
  const res = await fetch(`${globalThis.__TEST_BASE_URL__}/healthz`);
  const body = await res.text();
  const headers = Object.fromEntries(res.headers.entries());
  console.log("/healthz headers", headers);
  console.log("/healthz body", body);
  expect(true).toBe(true);
});
