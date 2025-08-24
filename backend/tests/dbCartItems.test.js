process.env.DB_URL = "postgres://user:pass@localhost/db";

jest.mock("pg");
const { Pool } = require("pg");
const mPool = { query: jest.fn() };
Pool.mockImplementation(() => mPool);

const db = require("../db");

afterEach(() => {
  jest.clearAllMocks();
});

describe("cart items DAL", () => {
  test("insertCartItem inserts and returns row", async () => {
    mPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const row = await db.insertCartItem("u1", "j1", 2);
    expect(row).toEqual({ id: 1 });
    expect(mPool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO cart_items"),
      ["u1", "j1", 2],
    );
  });

  test("updateCartItem updates and returns row", async () => {
    mPool.query.mockResolvedValueOnce({ rows: [{ id: 1, quantity: 3 }] });
    const row = await db.updateCartItem(1, 3);
    expect(row).toEqual({ id: 1, quantity: 3 });
    expect(mPool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE cart_items"),
      [1, 3],
    );
  });

  test("deleteCartItem issues delete query", async () => {
    mPool.query.mockResolvedValueOnce({});
    await db.deleteCartItem(5);
    expect(mPool.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM cart_items"),
      [5],
    );
  });

  test("getCartItems returns rows", async () => {
    const rows = [{ id: 1 }];
    mPool.query.mockResolvedValueOnce({ rows });
    const result = await db.getCartItems("u1");
    expect(result).toEqual(rows);
    expect(mPool.query).toHaveBeenCalledWith(expect.any(String), ["u1"]);
  });

  test("getCartItems handles empty result", async () => {
    mPool.query.mockResolvedValueOnce({ rows: [] });
    const result = await db.getCartItems("u1");
    expect(result).toEqual([]);
  });

  test("clearCart issues delete", async () => {
    mPool.query.mockResolvedValueOnce({});
    await db.clearCart("u1");
    expect(mPool.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM cart_items WHERE user_id"),
      ["u1"],
    );
  });

  test("propagates query errors", async () => {
    mPool.query.mockRejectedValueOnce(new Error("fail"));
    await expect(db.insertCartItem("u1", "j1", 1)).rejects.toThrow("fail");
  });
});
