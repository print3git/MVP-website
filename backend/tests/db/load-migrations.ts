import fs from "fs";
import path from "path";
import { runSql } from "./pgmem-setup";

export async function loadMigrations() {
  const dir = path.join(__dirname, "../../migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    try {
      await runSql(sql);
    } catch {
      // pg-mem doesn't implement every Postgres feature used in migrations
    }
  }
}
