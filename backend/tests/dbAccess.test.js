jest.mock("pg");
const { Pool } = require("pg");
const mQuery = jest.fn();
Pool.mockImplementation(() => ({ query: mQuery }));
const db = require("../db");

beforeEach(() => {
  mQuery.mockReset();
});

test("getRewardOption returns database value when present", async () => {
  mQuery.mockResolvedValueOnce({ rows: [{ amount_cents: 250 }] });
  const result = await db.getRewardOption(50);
  expect(mQuery).toHaveBeenCalledWith(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [50],
  );
  expect(result).toEqual({ amount_cents: 250 });
});

test("getRewardOption propagates query error", async () => {
  mQuery.mockRejectedValueOnce(new Error("fail"));
  await expect(db.getRewardOption(20)).rejects.toThrow("fail");
});
