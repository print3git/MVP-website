#!/usr/bin/env node
const { spawnSync } = require("child_process");

if (process.env.SKIP_PW_DEPS) {
  console.log("Skipping apt check due to SKIP_PW_DEPS");
  process.exit(0);
}

for (let i = 1; i <= 3; i++) {
  const result = spawnSync("sudo", ["apt-get", "update"], { encoding: "utf8" });
  if (result.status === 0) {
    console.log("✅ apt update succeeded");
    process.exit(0);
  }
  if (i < 3) {
    console.error(`apt-get update failed, retrying (${i}/3)...`);
  } else {
    process.stderr.write(result.stderr || "");
    process.stdout.write(result.stdout || "");
    console.error(
      "apt-get update failed after multiple attempts. " +
        "Repositories may be unreachable. Set SKIP_PW_DEPS=1 to skip.",
    );
    process.exit(result.status || 1);
  }
}
