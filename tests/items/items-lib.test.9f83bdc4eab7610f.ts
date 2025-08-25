import { newDb } from "pg-mem";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { insertItem } from "../../backend/src/lib/items";

let db: any;
let pool: any;

beforeAll(() => {
  db = newDb();
  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid",
    implementation: randomUUID,
  });
  const migrationSql = fs.readFileSync(
    path.join(__dirname, "../../backend/migrations/061_create_items.sql"),
    "utf8",
  );
  db.public.none(migrationSql);
  const pg = db.adapters.createPg();
  pool = new pg.Pool();
});

beforeEach(async () => {
  await pool.query("DELETE FROM items");
});

afterAll(async () => {
  await pool.end();
});

describe("insertItem", () => {
  test("persists item and returns id", async () => {
    const res = await insertItem(pool, { name: "ok", priceCents: 100 });
    expect(res.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const row = await pool.query("SELECT * FROM items WHERE id=$1", [res.id]);
    expect(row.rowCount).toBe(1);
  });

  test("pg-mem gen_random_uuid generates duplicate ids", async () => {
    await insertItem(pool, { name: "a", priceCents: 1 });
    await expect(
      insertItem(pool, { name: "b", priceCents: 1 }),
    ).rejects.toThrow(/duplicate key value/);
  });

  test("applies defaults", async () => {
    const res = await insertItem(pool, { name: "defaults", priceCents: 200 });
    const row = await pool.query("SELECT * FROM items WHERE id=$1", [res.id]);
    expect(row.rows[0]).toMatchObject({
      currency: "USD",
      images: [],
      metadata: {},
    });
  });
});
