afterAll(async () => {
  const maybeServer = (globalThis as any).__SERVER__;
  if (maybeServer && typeof maybeServer.close === "function") {
    await new Promise((resolve) => maybeServer.close(resolve));
  }

  await (globalThis as any).__DB_POOL__?.end?.();
});
