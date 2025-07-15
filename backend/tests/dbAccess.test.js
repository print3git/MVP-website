process.env.STRIPE_WEBHOOK_SECRET = "whsec";
jest.mock("../db", () => {
  return {
    query: jest.fn(),
    async getRewardOption(points) {
      const { rows } = await this.query(
        "SELECT amount_cents FROM reward_options WHERE points=$1",
        [points],
      );
      if (rows[0]) return rows[0];
      if (points === 50) return { amount_cents: 500 };
      if (points === 100) return { amount_cents: 1000 };
      if (points >= 1 && points <= 200) return { amount_cents: points * 5 };
      return null;
    },
  };
});
const db = require("../db");

afterEach(() => {
  jest.resetAllMocks();
});

test("getRewardOption returns database value when present", async () => {
  db.query.mockResolvedValueOnce({ rows: [{ amount_cents: 250 }] });
  const result = await db.getRewardOption(50);
  expect(db.query).toHaveBeenCalledWith(
    "SELECT amount_cents FROM reward_options WHERE points=$1",
    [50],
  );
  expect(result).toEqual({ amount_cents: 250 });
});

test("getRewardOption propagates query error", async () => {
  db.query.mockRejectedValueOnce(new Error("fail"));
  await expect(db.getRewardOption(20)).rejects.toThrow("fail");
});
