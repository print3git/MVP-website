const express = require("express");
const request = require("supertest");

jest.mock("../db", () => ({
  createItem: jest.fn(),
}));
const db = require("../db");

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.post("/api/items", async (req, res) => {
    try {
      const item = await db.createItem(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/items", () => {
  test("returns 400 for malformed body", async () => {
    db.createItem.mockRejectedValueOnce(new Error("invalid"));
    const res = await request(app).post("/api/items").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "invalid" });
    expect(db.createItem).toHaveBeenCalled();
  });
});
