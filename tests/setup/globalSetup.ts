import { startDevServer } from '../../scripts/dev-server';
import { Pool } from 'pg';
import type { AddressInfo } from 'net';

export default async function globalSetup() {
  const dbUrl = process.env.DB_URL;
  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl });
    await pool.query('SELECT 1');
    (globalThis as any).__DB_POOL__ = pool;
  }
  const server = startDevServer(0);
  const { port } = server.address() as AddressInfo;
  (globalThis as any).__TEST_SERVER__ = server;
  (globalThis as any).__TEST_BASE_URL__ = `http://127.0.0.1:${port}`;
}
