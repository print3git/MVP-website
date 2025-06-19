const { computeTaxOwed } = require("../accounting");

test("returns 0 for unknown region", () => {
  expect(computeTaxOwed(100, "XX")).toBe(0);
});

test("computes VAT for UK", () => {
  expect(computeTaxOwed(100, "UK")).toBe(20);
});

test("computes GST for AU", () => {
  expect(computeTaxOwed(100, "AU")).toBe(10);
});
