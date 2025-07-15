const {
  _computeDailyPrintsSold,
  _setDailyPrintsSold,
  getDailyPrintsSold,
} = require("../../utils/dailyPrints");

describe("_computeDailyPrintsSold", () => {
  test("returns deterministic value for a given date", () => {
    const date = new Date("2023-01-01T12:00:00Z");
    expect(_computeDailyPrintsSold(date)).toBe(37);
  });

  test("value is within expected range", () => {
    const val = _computeDailyPrintsSold(new Date());
    expect(val).toBeGreaterThanOrEqual(30);
    expect(val).toBeLessThanOrEqual(50);
  });
});

describe("getDailyPrintsSold", () => {
  test("reflects internal counter", () => {
    _setDailyPrintsSold(42);
    expect(getDailyPrintsSold()).toBe(42);
  });
});
