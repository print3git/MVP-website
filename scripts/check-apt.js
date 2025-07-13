#!/usr/bin/env node
const { spawnSync } = require("child_process");

function commandExists(cmd) {
  const res = spawnSync("which", [cmd], { encoding: "utf8" });
  return res.status === 0;
}

if (process.env.SKIP_PW_DEPS) {
  console.log("Skipping apt check due to SKIP_PW_DEPS");
  process.exit(0);
}

if (!commandExists("apt-get")) {
  console.log("apt-get not found, skipping apt check");
  process.exit(0);
}

if (!commandExists("sudo")) {
  console.log("sudo not found, skipping apt check");
  process.exit(0);
}

for (let i = 1; i <= 3; i++) {
  const update = spawnSync("sudo", ["apt-get", "update"], { encoding: "utf8" });
  if (update.status === 0) {
    const install = spawnSync(
      "sudo",
      [
        "apt-get",
        "-y",
        "--no-install-recommends",
        "--dry-run",
        "install",
        "ca-certificates",
      ],
      { encoding: "utf8" },
    );
    if (install.status === 0) {
      console.log("✅ apt update and install check succeeded");
      process.exit(0);
    }
    process.stderr.write(install.stderr || "");
    process.stdout.write(install.stdout || "");
    console.error(
      "apt-get install check failed. Set SKIP_PW_DEPS=1 to skip Playwright dependencies.",
    );
    process.exit(install.status || 1);
  }
  if (i < 3) {
    console.error(`apt-get update failed, retrying (${i}/3)...`);
  } else {
    process.stderr.write(update.stderr || "");
    process.stdout.write(update.stdout || "");
    console.error(
      "apt-get update failed after multiple attempts. Repositories may be unreachable. Set SKIP_PW_DEPS=1 to skip.",
    );
    process.exit(update.status || 1);
  }
}
