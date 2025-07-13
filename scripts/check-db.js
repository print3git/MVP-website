#!/usr/bin/env node
const path = require("path");
let Client;
try {
  ({ Client } = require("pg"));
} catch {
  ({ Client } = require(path.join(__dirname, "..", "backend", "node_modules", "pg")));
}

if (process.env.SKIP_DB_CHECK) {
  console.log("Skipping DB check due to SKIP_DB_CHECK");
  process.exit(0);
}

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  console.error("DB_URL is not set");
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log("✅ database OK");
  } catch (err) {
    console.error("Unable to connect to database");
    console.error(err.message);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch (err2) {
      // ignore errors closing connection
      void err2;
    }
  }
})();
