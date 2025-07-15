jest.mock("pg", () => {
  const mPool = { query: jest.fn() };
  return { Pool: jest.fn(() => mPool) };
});
const db = require("../db");
const { Pool } = require("pg");
const mPool = Pool.mock.results[0].value;

beforeEach(() => {
  mPool.query.mockReset();
});

test("getRewardOption returns database value when present", async () => {
  mPool.query.mockResolvedValueOnce({ rows: [{ amount_cents: 250 }] });
  const result = await db.getRewardOption(50);
  expect(mPool.query).toHaveBeenCalledWith(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [50],
  );
  expect(result).toEqual({ amount_cents: 250 });
});

test("getRewardOption propagates query error", async () => {
  mPool.query.mockRejectedValueOnce(new Error("fail"));
  await expect(db.getRewardOption(20)).rejects.toThrow("fail");
});
