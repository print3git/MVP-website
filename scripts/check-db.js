#!/usr/bin/env node
const path = require("path");
let pg;
try {
  pg = require("pg");
} catch {
  try {
    pg = require(
      require.resolve("pg", {
        paths: [path.join(__dirname, "..", "backend", "node_modules")],
      }),
    );
  } catch {
    console.error(
      "Unable to load 'pg' module. Run 'npm run setup' to install dependencies.",
    );
    process.exit(1);
  }
}
const { Client } = pg;

if (process.env.SKIP_DB_CHECK) {
  console.log("Skipping DB check due to SKIP_DB_CHECK");
  process.exit(0);
}

const dbUrl = process.env.DB_URL;
if (!dbUrl) {
  console.error("DB_URL is not set");
  process.exit(1);
}

const placeholderDb = "postgres://user:password@localhost:5432/your_database";
if (dbUrl === placeholderDb) {
  console.log("Skipping DB check for placeholder DB_URL");
  process.exit(0);
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
