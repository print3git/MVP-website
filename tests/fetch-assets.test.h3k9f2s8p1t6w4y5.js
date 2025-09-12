const { resolve } = require("node:path");
const fs = require("node:fs");

test("fetch-assets script exists", () => {
  const script = resolve(__dirname, "../scripts/fetch-assets.cjs");
  expect(fs.existsSync(script)).toBe(true);
});
