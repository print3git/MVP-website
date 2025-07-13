const fs = require("fs");
const path = require("path");

test("uses npx jest in the coverage script", () => {
  const pkgPath = path.join(__dirname, "..", "backend", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  expect(pkg.scripts.coverage).toMatch(/npx jest/);
});
