const incentives = require("../../src/utils/incentives");

describe("incentives utilities", () => {
  test("firstOrderPrice leaves price unchanged when user ordered before", () => {
    expect(incentives.firstOrderPrice("u1", 100)).toBe(100);
  });

  test("referralPrintPrice returns base price below threshold", () => {
    expect(incentives.referralPrintPrice(2, 120)).toBe(120);
  });

  test("referralPrintPrice is free after three referrals", () => {
    expect(incentives.referralPrintPrice(3, 50)).toBe(0);
  });
});
