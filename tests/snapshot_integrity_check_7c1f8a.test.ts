const { spawnSync } = require("child_process");
const path = require("path");
const glob = require("glob");

test("snapshot files updated recently", () => {
  const repoRoot = path.resolve(__dirname, "..");
  const snapFiles = glob.sync("**/*.snap", {
    cwd: repoRoot,
    absolute: true,
    ignore: ["**/node_modules/**"],
  });

  const now = Date.now() / 1000;
  const twoWeeks = 14 * 24 * 60 * 60;
  const stale = [];

  for (const file of snapFiles) {
    const res = spawnSync("git", ["log", "-1", "--format=%ct", file], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const last = parseInt(res.stdout.trim(), 10);
    if (!Number.isNaN(last) && now - last > twoWeeks) {
      stale.push(path.relative(repoRoot, file));
      console.warn(`stale snapshot detected: ${path.relative(repoRoot, file)}`);
    }
  }

  if (stale.length > 0) {
    console.warn(`found ${stale.length} stale snapshot(s)`);
  }

  expect(stale.length).toBeLessThanOrEqual(5);
});
