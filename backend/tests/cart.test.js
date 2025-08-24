process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("../db", () => ({
  insertCartItem: jest.fn(),
  updateCartItem: jest.fn(),
  deleteCartItem: jest.fn(),
  getCartItems: jest.fn().mockResolvedValue([]),
  clearCart: jest.fn(),
  insertOrderItems: jest.fn(),
  query: jest.fn(),
}));
const db = require("../db");

jest.mock("stripe");
const Stripe = require("stripe");
const stripeMock = {
  checkout: {
    sessions: { create: jest.fn().mockResolvedValue({ id: "cs", url: "u" }) },
  },
};
Stripe.mockImplementation(() => stripeMock);

const request = require("supertest");
const app = require("../server");
const jwt = require("jsonwebtoken");

test("POST /api/cart/items adds item", async () => {
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  db.insertCartItem.mockResolvedValueOnce({ id: 1 });
  const res = await request(app)
    .post("/api/cart/items")
    .set("authorization", `Bearer ${token}`)
    .send({ jobId: "j1", quantity: 2 });
  expect(res.status).toBe(200);
  expect(db.insertCartItem).toHaveBeenCalledWith("u1", "j1", 2);
});

test("PATCH /api/cart/items/:id updates item", async () => {
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  db.updateCartItem.mockResolvedValueOnce({ id: 1, quantity: 3 });
  const res = await request(app)
    .patch("/api/cart/items/1")
    .set("authorization", `Bearer ${token}`)
    .send({ quantity: 3 });
  expect(res.status).toBe(200);
  expect(db.updateCartItem).toHaveBeenCalledWith("1", 3);
});

test("DELETE /api/cart/items/:id removes item", async () => {
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  const res = await request(app)
    .delete("/api/cart/items/1")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(204);
  expect(db.deleteCartItem).toHaveBeenCalledWith("1");
});

test("GET /api/cart returns items", async () => {
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  db.getCartItems.mockResolvedValueOnce([{ id: 1 }]);
  const res = await request(app)
    .get("/api/cart")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.items)).toBe(true);
});

test("POST /api/cart/checkout creates session", async () => {
  const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
  db.getCartItems.mockResolvedValueOnce([{ id: 1, job_id: "j1", quantity: 1 }]);
  const res = await request(app)
    .post("/api/cart/checkout")
    .set("authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(stripeMock.checkout.sessions.create).toHaveBeenCalled();
  expect(db.clearCart).toHaveBeenCalled();
});
