const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

function detect() {
  const pkgPath = path.join(__dirname, "..", "..", "package.json");
  let pm = "npm";
  let hasPnpm = false;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (
      typeof pkg.packageManager === "string" &&
      pkg.packageManager.startsWith("pnpm@")
    ) {
      pm = "pnpm";
    }
  } catch {
    // ignore
  }

  try {
    const res = cp.spawnSync("pnpm", ["--version"], { stdio: "ignore" });
    hasPnpm = res.status === 0;
  } catch {
    hasPnpm = false;
  }

  return { pm, hasPnpm };
}

module.exports = detect;
