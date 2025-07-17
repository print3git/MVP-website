const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

test("npm run build succeeds and js folder exists", () => {
  const result = spawnSync("npm", ["run", "build"], { encoding: "utf8" });
  expect(result.status).toBe(0);
  const jsDir = path.join(__dirname, "..", "..", "js");
  expect(fs.existsSync(jsDir)).toBe(true);
  const files = fs.readdirSync(jsDir);
  expect(files.length).toBeGreaterThan(0);
});
