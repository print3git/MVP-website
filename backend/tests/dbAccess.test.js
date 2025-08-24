const db = require("../db");

beforeEach(() => {
  db.query = jest.fn();
});

test("getRewardOption returns database value when present", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ amount_cents: 250 }] });
  const result = await db.getRewardOption(50);
  expect(db.query).toHaveBeenCalledWith(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [50],
  );
  expect(result).toBe(250);
});

test("getRewardOption propagates query error", async () => {
  db.query.mockRejectedValueOnce(new Error("fail"));
  await expect(db.getRewardOption(20)).rejects.toThrow("fail");
});

test("getRewardOption throws when no result", async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  await expect(db.getRewardOption(999)).rejects.toThrow(
    "No reward option found for points: 999",
  );
});
