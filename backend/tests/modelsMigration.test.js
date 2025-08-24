const fs = require("fs");
const path = require("path");
require("pgsql-ast-parser");
const { newDb } = require("pg-mem");

test("models table has expected columns", async () => {
  const db = newDb();
  const sqlPath = path.join(
    __dirname,
    "..",
    "db",
    "migrations",
    "001_create_models_table.sql",
  );
  const sql = fs.readFileSync(sqlPath, "utf8");
  db.public.none(sql);

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const { rows } = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='models'",
  );
  const columnTypes = Object.fromEntries(
    rows.map((r) => [r.column_name, r.data_type]),
  );
  expect(columnTypes).toMatchObject({
    id: "integer",
    prompt: "text",
    url: "text",
    created_at: "timestamptz",
  });
});
