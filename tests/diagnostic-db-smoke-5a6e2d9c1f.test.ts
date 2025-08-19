import path from 'path';

let pg: any;
try {
  pg = require('pg');
} catch {
  pg = require(require.resolve('pg', { paths: [path.join(__dirname, '..', 'backend', 'node_modules')] }));
}
const { Client } = pg;

describe('diagnostic db smoke', () => {
  test('connects to database', async () => {
    const url = process.env.DB_URL;
    const placeholder =
      !url ||
      /your_database|example|dummy|postgres:\/\/user:password@localhost:5432\/your_database/.test(url);
    if (placeholder) {
      throw new Error('DB_URL missing or placeholder');
    }
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      await client.query('SELECT 1');
    } catch (err: any) {
      throw new Error(`Database connection failed: ${err.message}`);
    } finally {
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  });
});
