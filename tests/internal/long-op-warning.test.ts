const defaultTimeout = 5000; // Jest's default per-test timeout
jest.setTimeout(defaultTimeout + 1000); // allow a little extra time

const run = process.env.CI_ONLY === "1" ? test : test.skip;

run("warns when long operations hit the per-test timeout", async () => {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, defaultTimeout));
  const elapsed = Date.now() - start;
  if (elapsed >= defaultTimeout) {
    console.warn(
      `Long operation hit per-test timeout of ${defaultTimeout}ms (elapsed ${elapsed}ms)`,
    );
  }
});
