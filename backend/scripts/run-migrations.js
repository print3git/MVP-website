require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

(async () => {
  const client = new Client({ connectionString: process.env.DB_URL });
  await client.connect();
  try {
    const dir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query(sql);
      console.info(`Ran migration ${file}`);
    }
  } finally {
    await client.end();
  }
})();
