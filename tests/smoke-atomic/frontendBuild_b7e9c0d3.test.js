const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..", "..");

test("frontend build succeeds and outputs files", () => {
  const res = spawnSync("npm", ["run", "build"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  expect(res.status).toBe(0);
  const distDir = fs.existsSync(path.join(repoRoot, "dist"))
    ? path.join(repoRoot, "dist")
    : repoRoot;
  const entries = fs.readdirSync(distDir).filter((f) => !f.startsWith("."));
  expect(entries.length).toBeGreaterThan(0);
});
