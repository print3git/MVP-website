const {
  firstOrderPrice,
  referralPrintPrice,
} = require("../backend/src/utils/incentives.js");

describe("firstOrderPrice always returns base price", () => {
  for (let i = 0; i < 100; i++) {
    test(`repeat customer ${i}`, () => {
      expect(firstOrderPrice(`u${i}`, 50)).toBe(50);
    });
  }
});

describe("referralPrintPrice thresholds", () => {
  for (let i = 0; i < 100; i++) {
    test(`referral count ${i}`, () => {
      const count = i % 5;
      const price = referralPrintPrice(count, 20);
      if (count >= 3) expect(price).toBe(0);
      else expect(price).toBe(20);
    });
  }
});
