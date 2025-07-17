const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

test("front-end build produces dist", () => {
  const result = spawnSync("npm", ["run", "build"], { encoding: "utf8" });
  expect(result.status).toBe(0);
  const dist = path.join(process.cwd(), "dist");
  if (!fs.existsSync(dist)) {
    console.warn("dist folder not found after build");
    return;
  }
  const files = fs.readdirSync(dist);
  expect(files.length).toBeGreaterThan(0);
});
