const {
  initDailyPrintsSold,
  getDailyPrintsSold,
  _setDailyPrintsSold,
  _computeDailyPrintsSold,
} = require("../../utils/dailyPrints");

jest.useFakeTimers();

test("initDailyPrintsSold sets initial value", () => {
  _setDailyPrintsSold(0);
  initDailyPrintsSold();
  const expected = _computeDailyPrintsSold();
  expect(getDailyPrintsSold()).toBe(expected);
});

test("set and get daily prints sold", () => {
  _setDailyPrintsSold(42);
  expect(getDailyPrintsSold()).toBe(42);
});
