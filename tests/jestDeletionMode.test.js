/** Ensure jest deletion warnings are disabled */
test("jest deletion mode disabled", () => {
  expect(global[Symbol.for("$$jest-deletion-mode")]).toBe("off");
});
