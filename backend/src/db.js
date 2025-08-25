const { Pool } = require("pg");

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  throw new Error("DB_URL is required");
}

const pool = new Pool({ connectionString: dbUrl });

function close() {
  return pool.end();
}

module.exports = { pool, close };
