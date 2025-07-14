const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

test("cross-env available after setup", () => {
  execSync("SKIP_PW_DEPS=1 SKIP_NET_CHECKS=1 bash scripts/setup.sh", {
    stdio: "inherit",
  });
  const binPath = path.join(
    __dirname,
    "..",
    "node_modules",
    ".bin",
    "cross-env",
  );
  expect(fs.existsSync(binPath)).toBe(true);
  const result = spawnSync(binPath, ["echo", "hello"], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe("hello");
});
