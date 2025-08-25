import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { pool, close } from "../src/db";

config();

export async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS migrations (id text primary key)",
    );
    const dir = path.join(__dirname, "..", "migrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const res = await client.query("SELECT 1 FROM migrations WHERE id=$1", [
        file,
      ]);
      if (res.rowCount) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO migrations(id) VALUES($1)", [file]);
      console.log(`Applied ${file}`);
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrate()
    .then(() => close())
    .then(() => {
      console.log("Migrations complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      close().then(() => process.exit(1));
    });
}
