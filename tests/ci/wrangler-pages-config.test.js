const { spawnSync } = require("node:child_process");
const path = require("node:path");

describe("wrangler.toml pages config", () => {
  test("config valid", () => {
    const script = path.join(
      __dirname,
      "..",
      "..",
      "scripts",
      "cf",
      "validate-wrangler.ts",
    );
    const res = spawnSync(
      "npx",
      ["-y", "ts-node", "--transpile-only", script],
      {
        encoding: "utf8",
      },
    );
    if (res.status !== 0) {
      throw new Error((res.stdout + res.stderr).trim());
    }
  });
});
