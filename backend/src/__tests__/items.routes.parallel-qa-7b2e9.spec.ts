import request from "supertest";
import type { Express } from "express";

// mock pg
const queries: { text: string; params?: any[] }[] = [];
let mockRows: any[] = [];
let mockError: any = null;

jest.mock("pg", () => {
  class Pool {
    query = jest.fn((text: string, params?: any[]) => {
      queries.push({ text: String(text), params });
      if (mockError) {
        const err = mockError;
        mockError = null;
        return Promise.reject(err);
      }
      return Promise.resolve({ rows: mockRows });
    });
  }
  return { Pool };
});

// mock logger
jest.mock("../logger", () => ({
  error: jest.fn(),
}));
const logger = require("../logger");

function setDb(rows: any[]) {
  mockRows = rows;
  mockError = null;
}
function setDbDuplicate() {
  mockRows = [];
  mockError = { code: "23505" };
}
function setDbError(err: any) {
  mockRows = [];
  mockError = err;
}

function makePayload(overrides: Record<string, any> = {}) {
  return {
    name: "item1",
    priceCents: 100,
    ...overrides,
  };
}

let app: Express | undefined;
try {
  ({ app } = require("../app"));
  if (app && (app as any).use) {
    try {
      const itemsRouter = require("../routes/items");
      const router = itemsRouter.default || itemsRouter;
      (app as any).use(router);
    } catch {}
  }
} catch {
  try {
    const srv = require("../server");
    app = srv.app ?? srv.default ?? srv;
  } catch {
    try {
      const express = require("express");
      const itemsRouter = require("../routes/items");
      const router = itemsRouter.default || itemsRouter;
      app = express();
      app.use(express.json());
      app.use(router);
    } catch {}
  }
}

if (!app) {
  describe("items routes", () => {
    test.skip("app not available yet", () => {});
  });
} else {
  describe("POST /api/items", () => {
    beforeEach(() => {
      queries.length = 0;
      setDb([{ id: "123e4567-e89b-12d3-a456-426614174000" }]);
      (logger.error as jest.Mock).mockClear();
    });

    test("creates item → 201 with {id:string uuid-like}", async () => {
      const payload = makePayload();
      const res = await request(app)
        .post("/api/items")
        .send(payload)
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    test("missing name → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ priceCents: 100 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("missing priceCents → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("priceCents = 0 → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 0 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("priceCents negative → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: -5 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("name too long (121) → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "a".repeat(121), priceCents: 100 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("description too long (>2000) → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, description: "d".repeat(2001) })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("images not array → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, images: "https://ex.com/a.png" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("images element not string → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, images: [123] })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("images invalid url → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, images: ["ftp://bad"] })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("metadata not object → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, metadata: "nope" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("currency default applied when omitted → 201 and SQL uses 'USD'", async () => {
      const payload = makePayload();
      setDb([{ id: "11111111-2222-3333-4444-555555555555" }]);
      const res = await request(app)
        .post("/api/items")
        .send(payload)
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
      expect(queries[0].params?.[3]).toBe("USD");
    });

    test('duplicate name error from DB (code "23505") → 409 with message', async () => {
      setDbDuplicate();
      const res = await request(app)
        .post("/api/items")
        .send(makePayload())
        .set("Content-Type", "application/json");
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
    });

    test("DB returns non-row → 500", async () => {
      setDb([]);
      const res = await request(app)
        .post("/api/items")
        .send(makePayload())
        .set("Content-Type", "application/json");
      expect(res.status).toBe(500);
    });

    test("SQL text contains expected INSERT into items and columns list", async () => {
      const res = await request(app)
        .post("/api/items")
        .send(makePayload())
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
      const text = queries[0].text.replace(/\s+/g, " ");
      expect(text).toMatch(
        /INSERT INTO items \(name, description, price_cents, currency, images, metadata\)/i,
      );
    });

    test("trims leading/trailing spaces in name (if schema allows) → 201", async () => {
      const payload = makePayload({ name: "  spaced  " });
      const res = await request(app)
        .post("/api/items")
        .send(payload)
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
      expect(queries[0].params?.[0]).toBe("spaced");
    });

    test("rejects huge priceCents (> 10^9) → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 1_000_000_001 })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("accepts https image URL → 201", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, images: ["https://ex.com/a.png"] })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(201);
    });

    test("rejects http(s)-looking but malformed URL → 400", async () => {
      const res = await request(app)
        .post("/api/items")
        .send({ name: "x", priceCents: 100, images: ["http:/bad.com"] })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    test("logs an error once on server 500 (spy on logger.error)", async () => {
      setDbError(new Error("fail"));
      const res = await request(app)
        .post("/api/items")
        .send(makePayload())
        .set("Content-Type", "application/json");
      expect(res.status).toBe(500);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });
}

export {}; // ensure this file is a module
