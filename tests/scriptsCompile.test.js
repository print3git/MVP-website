const { execFileSync } = require("node:child_process");

describe("typescript script compilation", () => {
  test("scripts compile without errors", () => {
    execFileSync(
      "npx",
      [
        "tsc",
        "--noEmit",
        "scripts/auto-cloudflare-config.ts",
        "scripts/check-broken-symlinks-9ac8f74db5e1c32.ts",
      ],
      { stdio: "inherit" },
    );
  });
});
