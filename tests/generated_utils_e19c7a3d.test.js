const { stripAnsi } = require("../backend/src/utils/stripAnsi.js");
const { referralPrintPrice } = require("../backend/src/utils/incentives.js");
const { getEnv } = require("../backend/src/lib/getEnv.js");

describe("stripAnsi", () => {
  const input = "\u001b[31mred\u001b[0m";
  for (let i = 0; i < 200; i++) {
    test(`strip ${i}`, () => {
      expect(stripAnsi(input)).toBe("red");
    });
  }
});

describe("referralPrintPrice", () => {
  for (let i = 0; i < 200; i++) {
    test(`referrals ${i}`, () => {
      const price = referralPrintPrice(i % 5, 10);
      if (i % 5 >= 3) expect(price).toBe(0);
      else expect(price).toBe(10);
    });
  }
});

describe("getEnv required", () => {
  for (let i = 0; i < 100; i++) {
    test(`required ${i}`, () => {
      delete process.env.TEST_ENV_VAR;
      expect(() => getEnv("TEST_ENV_VAR", { required: true })).toThrow();
    });
  }
});
