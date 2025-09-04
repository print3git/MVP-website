const express = require("express");
const request = require("supertest");
const fs = require("fs");
const path = require("path");
const { newDb } = require("pg-mem");
const validate = require("../../middleware/validate.js");
const itemsLib = require("../../src/lib/items");
const { insertItemSchema } = itemsLib;

function makeDb() {
  const db = newDb();
  db.public.registerFunction({
    name: "gen_random_uuid",
    returns: "uuid",
    implementation: () => require("crypto").randomUUID(),
  });
  return db;
}

function buildApp() {
  const db = makeDb();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "..", "migrations", "061_create_items.sql"),
    "utf8",
  );
  db.public.none(sql);
  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const app = express();
  app.use(express.json());
  app.post("/api/items", validate(insertItemSchema), async (req, res) => {
    try {
      const { id } = await itemsLib.insertItem(pool, req.body);
      res.status(201).json({ id });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        err.code === "23505"
      ) {
        res.status(409).json({ error: "item name already exists" });
        return;
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  return { app, pool };
}

describe("POST /api/items", () => {
  test("creates item → 201 and returns id", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 100 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    await pool.end();
  });

  test("missing name → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app).post("/api/items").send({ priceCents: 100 });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("missing priceCents → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app).post("/api/items").send({ name: "item1" });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("priceCents = 0 → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 0 });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("negative price → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: -5 });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("name too long (121) → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "a".repeat(121), priceCents: 100 });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("description too long (>2000) → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({
        name: "item1",
        priceCents: 100,
        description: "d".repeat(2001),
      });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("images not array → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 100, images: "http://x.com/a.png" });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("images contains invalid URL → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({
        name: "item1",
        priceCents: 100,
        images: ["https://x.com/a.png", "ftp://bad"],
      });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("metadata not object → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 100, metadata: "nope" });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("large but valid payload → 201", async () => {
    const { app, pool } = buildApp();
    const payload = {
      name: "n".repeat(120),
      description: "d".repeat(2000),
      priceCents: 999999,
      currency: "GBP",
      images: Array.from(
        { length: 5 },
        (_, i) => `https://example.com/${i}.png`,
      ),
      metadata: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`k${i}`, `v${i}`]),
      ),
    };
    const res = await request(app).post("/api/items").send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    await pool.end();
  });

  test("duplicate name (if unique) → 409", async () => {
    const { app, pool } = buildApp();
    await request(app)
      .post("/api/items")
      .send({ name: "dupe", priceCents: 100 });
    const res = await request(app)
      .post("/api/items")
      .send({ name: "dupe", priceCents: 100 });
    expect(res.status).toBe(409);
    await pool.end();
  });

  test("invalid types (price as string) → 400", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: "100" });
    expect(res.status).toBe(400);
    await pool.end();
  });

  test("currency custom value passes", async () => {
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 100, currency: "EUR" });
    expect(res.status).toBe(201);
    await pool.end();
  });

  test("server error path mocked to throw → 500", async () => {
    const spy = jest
      .spyOn(itemsLib, "insertItem")
      .mockRejectedValueOnce(new Error("fail"));
    const { app, pool } = buildApp();
    const res = await request(app)
      .post("/api/items")
      .send({ name: "item1", priceCents: 100 });
    expect(res.status).toBe(500);
    spy.mockRestore();
    await pool.end();
  });
});
