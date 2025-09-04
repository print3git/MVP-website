import request from "supertest";
import type { InsertItemInput } from "../src/lib/items";

const mockInsertItem = jest.fn(async (_db: any, payload: InsertItemInput) => {
  if (payload.name === "dupe") {
    const err: any = new Error("duplicate");
    err.code = "23505";
    throw err;
  }
  return { id: "mock-id" };
});

jest.mock("../src/lib/items", () => {
  const actual = jest.requireActual("../src/lib/items");
  return {
    ...actual,
    insertItem: mockInsertItem,
  };
});

import { app } from "../src/app";

describe("smoke routes", () => {
  it("GET /health returns ok", async () => {
    let res = await request(app).get("/health");
    if (res.status === 404) {
      res = await request(app).get("/healthz");
    }
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true });
  });

  it("POST /api/items returns id", async () => {
    const res = await request(app).post("/api/items").send({
      name: "item",
      priceCents: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
  });

  it("duplicate name request returns conflict", async () => {
    const res = await request(app).post("/api/items").send({
      name: "dupe",
      priceCents: 1,
    });
    expect(res.status).toBe(409);
  });
});
