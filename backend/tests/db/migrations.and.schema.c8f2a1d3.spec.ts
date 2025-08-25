// @jest-environment node
import { db, makeClient } from "./pgmem-setup";
(globalThis as any).__PGMEM_DB__ = db;
import { loadMigrations } from "./load-migrations";

describe("061_create_items.sql", () => {
  let client: any;

  beforeAll(async () => {
    await loadMigrations();
    client = await makeClient();
  });

  afterAll(async () => {
    await client.end();
  });

  test("table exists", async () => {
    const res = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name='items' AND table_schema='public'",
    );
    expect(res.rowCount).toBe(1);
  });

  test("required columns & types", async () => {
    const res = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='items'",
    );
    expect(res.rows).toEqual(
      expect.arrayContaining([
        { column_name: "id", data_type: "uuid" },
        { column_name: "name", data_type: "text" },
        { column_name: "description", data_type: "text" },
        { column_name: "price_cents", data_type: "integer" },
        { column_name: "currency", data_type: "text" },
        { column_name: "images", data_type: "jsonb" },
        { column_name: "metadata", data_type: "jsonb" },
        { column_name: "created_at", data_type: "timestamptz" },
      ]),
    );
  });

  test("id default gen_random_uuid works", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('a',1) RETURNING id",
    );
    expect(res.rows[0].id).toMatch(/[0-9a-f-]{36}/);
  });

  test("name NOT NULL", async () => {
    await expect(
      client.query("INSERT INTO items (price_cents) VALUES (1)"),
    ).rejects.toThrow();
  });

  test("name UNIQUE (duplicate fails)", async () => {
    await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('dup',1)",
    );
    await expect(
      client.query("INSERT INTO items (name, price_cents) VALUES ('dup',1)"),
    ).rejects.toThrow();
  });

  test("price_cents NOT NULL", async () => {
    await expect(
      client.query("INSERT INTO items (name) VALUES ('p')"),
    ).rejects.toThrow();
  });

  test("price_cents CHECK > 0", async () => {
    await expect(
      client.query("INSERT INTO items (name, price_cents) VALUES ('zero',0)"),
    ).rejects.toThrow();
    await expect(
      client.query("INSERT INTO items (name, price_cents) VALUES ('neg',-5)"),
    ).rejects.toThrow();
  });

  test("currency DEFAULT 'USD'", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('curr',1) RETURNING currency",
    );
    expect(res.rows[0].currency).toBe("USD");
  });

  test("images DEFAULT [] jsonb", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('img',1) RETURNING images",
    );
    expect(JSON.parse(res.rows[0].images)).toEqual([]);
  });

  test("metadata DEFAULT {} jsonb", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('meta',1) RETURNING metadata",
    );
    expect(JSON.parse(res.rows[0].metadata)).toEqual({});
  });

  test("created_at default recent", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('time',1) RETURNING created_at",
    );
    const createdAt = new Date(res.rows[0].created_at);
    expect(Date.now() - createdAt.getTime()).toBeLessThan(5000);
  });

  test("minimal insert returns a row", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('mini',1) RETURNING *",
    );
    expect(res.rows[0]).toHaveProperty("id");
  });

  test("images persists array", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents, images) VALUES ('imgs',1,'[\"a\",\"b\"]') RETURNING images",
    );
    expect(JSON.parse(res.rows[0].images)).toEqual(["a", "b"]);
  });

  test("metadata persists object", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents, metadata) VALUES ('obj',1,'{\"a\":1}') RETURNING metadata",
    );
    expect(JSON.parse(res.rows[0].metadata)).toEqual({ a: 1 });
  });

  test("description omitted => NULL", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('desc',1) RETURNING description",
    );
    expect(res.rows[0].description).toBeNull();
  });

  test("null name => error", async () => {
    await expect(
      client.query("INSERT INTO items (name, price_cents) VALUES (NULL,1)"),
    ).rejects.toThrow();
  });

  test("very long name behavior (DB accepts; app enforces length)", async () => {
    const longName = "n".repeat(1000);
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ($1,1) RETURNING name",
      [longName],
    );
    expect(res.rows[0].name).toHaveLength(1000);
  });

  test("non-array images => error", async () => {
    await expect(
      client.query(
        "INSERT INTO items (name, price_cents, images) VALUES ('badimg',1,'not json')",
      ),
    ).rejects.toThrow();
  });

  test("non-object metadata => error", async () => {
    await expect(
      client.query(
        "INSERT INTO items (name, price_cents, metadata) VALUES ('badmeta',1,'not json')",
      ),
    ).rejects.toThrow();
  });

  test("round-trip select by id", async () => {
    const res = await client.query(
      "INSERT INTO items (name, price_cents) VALUES ('round',1) RETURNING id",
    );
    const sel = await client.query("SELECT name FROM items WHERE id=$1", [
      res.rows[0].id,
    ]);
    expect(sel.rows[0].name).toBe("round");
  });

  test.skip("verify unique constraint via pg_catalog", async () => {
    // pg-mem does not expose pg_index entries for unique constraints yet
    const res = await client.query(
      "SELECT ic.relname FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class t ON t.oid=i.indrelid JOIN pg_catalog.pg_class ic ON ic.oid=i.indexrelid WHERE t.relname='items' AND i.indisunique",
    );
    expect(res.rows.map((r: any) => r.relname)).toContain("items_name_key");
  });
});
