const fs = require("fs");
const path = require("path");
const { newDb } = require("../backend/node_modules/pg-mem");
const pg = require("../backend/node_modules/pg");

/**
 * Start the backend server on the given port using an in-memory Postgres DB.
 * @param {number} port test port to listen on
 * @returns {Promise<{url: string, close: () => Promise<void>}>} server helpers
 */
async function startServer(port = 4001) {
  // Prepare in-memory Postgres
  const db = newDb();
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "backend",
      "db",
      "migrations",
      "001_create_models_table.sql",
    ),
    "utf8",
  );
  await pool.query(sql);
  pg.Pool = Pool; // stub pg to use in-memory DB

  // Map env vars used by route
  process.env.CLOUDFRONT_MODEL_DOMAIN =
    process.env.CLOUDFRONT_MODEL_DOMAIN || "cdn.test";
  process.env.CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_MODEL_DOMAIN;
  process.env.DB_ENDPOINT = "mem";
  process.env.DB_PASSWORD = "mem";

  const app = require("../backend/src/app");

  return new Promise((resolve) => {
    const server = app.listen(port, () =>
      resolve({
        url: `https://localhost:${port}`,
        close: () => new Promise((r) => server.close(r)),
      }),
    );
  });
}

module.exports = { startServer };
