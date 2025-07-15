jest.mock("pg", () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({ query: jest.fn() })),
  };
});

const db = require("../db");
const mockPool = require("pg").Pool.mock.results[0].value;

beforeEach(() => {
  mockPool.query.mockReset();
});

test("getRewardOption returns database value when present", async () => {
  mockPool.query.mockResolvedValueOnce({ rows: [{ amount_cents: 250 }] });
  const result = await db.getRewardOption(50);
  expect(mockPool.query).toHaveBeenCalledWith(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [50],
  );
  expect(result).toEqual({ amount_cents: 250 });
});

test("getRewardOption propagates query error", async () => {
  mockPool.query.mockRejectedValueOnce(new Error("fail"));
  await expect(db.getRewardOption(20)).rejects.toThrow("fail");
});
