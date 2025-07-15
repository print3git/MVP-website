const fs = require("fs");

/** Ensure the root package-lock.json is valid JSON and not truncated. */
test("root package-lock.json parses", () => {
  const content = fs.readFileSync("package-lock.json", "utf8");
  expect(() => JSON.parse(content)).not.toThrow();
  const obj = JSON.parse(content);
  // Basic sanity check: should have lockfileVersion field
  expect(obj.lockfileVersion).toBeDefined();
});
