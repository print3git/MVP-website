export default async function globalTeardown() {
  const server = (globalThis as any).__TEST_SERVER__;
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  const pool = (globalThis as any).__DB_POOL__;
  if (pool) {
    await pool.end();
  }
}
