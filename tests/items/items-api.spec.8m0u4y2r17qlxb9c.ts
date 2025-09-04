const request = require("supertest");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { newDb } = require("pg-mem");
const validate = require("../../backend/middleware/validate.js");
const itemsLib = require("../../backend/src/lib/items");
const { randomUUID } = require("crypto");

let app;
let pool;
let db;

beforeAll(async () => {
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
  app = express();
  app.use(express.json());
  app.post(
    "/api/items",
    validate(itemsLib.insertItemSchema),
    async (req, res) => {
      try {
        const result = await itemsLib.insertItem(pool, req.body);
        res.status(201).json(result);
      } catch (err) {
        if (err && typeof err === "object" && err.code === "23505") {
          return res.status(409).json({ error: "item name already exists" });
        }
        res.status(500).json({ error: "Internal Server Error" });
      }
    },
  );
});

beforeEach(async () => {
  await pool.query("DELETE FROM items");
});

afterAll(async () => {
  await pool.end();
});

describe("/api/items pipeline", () => {
  test("migration creates items table", async () => {
    const res = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='items'",
    );
    const cols = res.rows.map((r) => r.column_name).sort();
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "price_cents",
        "currency",
        "images",
        "metadata",
        "created_at",
      ]),
    );
  });

  test("successfully insert item with minimal fields", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "Minimal", priceCents: 100 });
    expect(res.status).toBe(201);
  });

  test("successfully insert item with full fields", async () => {
    const payload = {
      name: "Full",
      description: "desc",
      priceCents: 200,
      currency: "EUR",
      images: ["http://example.com/a.png"],
      metadata: { a: 1 },
    };
    const res = await request(app).post("/api/items").send(payload);
    expect(res.status).toBe(201);
  });

  test("response includes a UUID", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "Uuid", priceCents: 300 });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  test("database contains new item after insertion", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "DBCheck", priceCents: 400 });
    const { id } = res.body;
    const row = await pool.query("SELECT * FROM items WHERE id=$1", [id]);
    expect(row.rowCount).toBe(1);
  });

  test("reject missing name", async () => {
    const res = await request(app).post("/api/items").send({ priceCents: 100 });
    expect(res.status).toBe(400);
  });

  test("reject empty string name", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "", priceCents: 100 });
    expect(res.status).toBe(400);
  });

  test("reject negative priceCents", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "neg", priceCents: -1 });
    expect(res.status).toBe(400);
  });

  test("reject non-numeric priceCents", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "bad", priceCents: "abc" });
    expect(res.status).toBe(400);
  });

  test("reject currency not in USD/EUR/GBP", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "badcur", priceCents: 100, currency: "JPY" });
    expect(res.status).toBe(400);
  });

  test("reject invalid image URL", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({
        name: "badimg",
        priceCents: 100,
        images: ["ftp://example.com/a.png"],
      });
    expect(res.status).toBe(400);
  });

  test("reject malformed metadata", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "badmeta", priceCents: 100, metadata: "not-object" });
    expect(res.status).toBe(400);
  });

  test("reject overly long description", async () => {
    const longDesc = "a".repeat(2001);
    const res = await request(app)
      .post("/api/items")
      .send({ name: "longdesc", priceCents: 100, description: longDesc });
    expect(res.status).toBe(400);
  });

  test("reject overly long name", async () => {
    const longName = "a".repeat(121);
    const res = await request(app)
      .post("/api/items")
      .send({ name: longName, priceCents: 100 });
    expect(res.status).toBe(400);
  });

  test("duplicate name returns 409", async () => {
    await request(app)
      .post("/api/items")
      .send({ name: "dupe", priceCents: 100 });
    const res = await request(app)
      .post("/api/items")
      .send({ name: "dupe", priceCents: 100 });
    expect(res.status).toBe(409);
  });

  test("unexpected DB error returns 500", async () => {
    const spy = jest
      .spyOn(itemsLib, "insertItem")
      .mockRejectedValueOnce(new Error("boom"));
    const res = await request(app)
      .post("/api/items")
      .send({ name: "err", priceCents: 100 });
    expect(res.status).toBe(500);
    spy.mockRestore();
  });

  test("missing Content-Type header returns 400", async () => {
    const res = await request(app)
      .post("/api/items")
      .unset("Content-Type")
      .send('{"name":"x","priceCents":100}');
    expect(res.status).toBe(400);
  });

  test("sending empty JSON returns 400", async () => {
    const res = await request(app).post("/api/items").send({});
    expect(res.status).toBe(400);
  });

  test("default currency is USD if omitted", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "defcur", priceCents: 100 });
    const row = await pool.query("SELECT currency FROM items WHERE id=$1", [
      res.body.id,
    ]);
    expect(row.rows[0].currency).toBe("USD");
  });

  test("default images is empty array", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "defimg", priceCents: 100 });
    const row = await pool.query("SELECT images FROM items WHERE id=$1", [
      res.body.id,
    ]);
    expect(row.rows[0].images).toEqual([]);
  });

  test("default metadata is empty object", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "defmeta", priceCents: 100 });
    const row = await pool.query("SELECT metadata FROM items WHERE id=$1", [
      res.body.id,
    ]);
    expect(row.rows[0].metadata).toEqual({});
  });

  test("created_at timestamp is set automatically", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({ name: "timestamp", priceCents: 100 });
    const row = await pool.query("SELECT created_at FROM items WHERE id=$1", [
      res.body.id,
    ]);
    expect(new Date(row.rows[0].created_at).getTime()).toBeLessThan(Date.now());
  });

  test("SQL injection attempt in name does not succeed", async () => {
    const evil = "test'); DROP TABLE items;--";
    const res = await request(app)
      .post("/api/items")
      .send({ name: evil, priceCents: 100 });
    expect(res.status).toBe(201);
    const rows = await pool.query("SELECT name FROM items");
    expect(rows.rowCount).toBe(1);
    expect(rows.rows[0].name).toBe(evil);
  });

  test("large payload rejected", async () => {
    const big = "a".repeat(1024 * 1024 + 1);
    const res = await request(app)
      .post("/api/items")
      .send({ name: "big", priceCents: 100, description: big });
    expect([400, 413]).toContain(res.status);
  });

  test("request completes under 2s", async () => {
    const start = Date.now();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "fast", priceCents: 100 });
    const duration = Date.now() - start;
    expect(res.status).toBe(201);
    expect(duration).toBeLessThan(2000);
  });
});
