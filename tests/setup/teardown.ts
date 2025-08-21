afterAll(async () => {
  const maybeServers = (globalThis as any).__servers;
  if (Array.isArray(maybeServers)) {
    await Promise.all(
      maybeServers.map((srv) =>
        typeof srv.close === "function"
          ? new Promise((resolve) => srv.close(resolve))
          : Promise.resolve(),
      ),
    );
  }

  const maybeServer = (globalThis as any).__SERVER__;
  if (maybeServer && typeof maybeServer.close === "function") {
    await new Promise((resolve) => maybeServer.close(resolve));
  }

  await (globalThis as any).__DB_POOL__?.end?.();

  const stripeMock =
    (globalThis as any).__STRIPE_MOCK__ ||
    (globalThis as any).__STRIPE_PROCESS__;
  if (stripeMock) {
    if (typeof stripeMock.close === "function") {
      await new Promise((resolve) => stripeMock.close(resolve));
    } else if (typeof stripeMock.kill === "function") {
      stripeMock.kill("SIGTERM");
    }
  }
});
