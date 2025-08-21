const { computeTaxOwed } = require("../../../backend/accounting");

describe("computeTaxOwed", () => {
  test("calculates tax for known region", () => {
    expect(computeTaxOwed(100, "UK")).toBe(20);
  }, 1000);

  test("returns 0 for unknown region", () => {
    expect(computeTaxOwed(50, "XX")).toBe(0);
  }, 1000);

  test("handles invalid amount", () => {
    expect(computeTaxOwed(-10, "UK")).toBe(0);
  }, 1000);
});
