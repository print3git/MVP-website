const path = require("path");

// Ensure requiring the logger doesn't fail due to missing dependencies
// This helps catch cases where npm setup was skipped

test("logger module loads without missing dependencies", () => {
  const load = () => require(path.join("..", "src", "logger"));
  expect(load).not.toThrow();
});
