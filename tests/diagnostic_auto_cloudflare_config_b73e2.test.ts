import { execFileSync, spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

const script = path.resolve(__dirname, "../scripts/auto-cloudflare-config.ts");

describe("auto-cloudflare-config", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-config-"));
  const cfgPath = path.join(tmpDir, "config.json");

  beforeEach(() => {
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({ buildCommand: "echo build" }, null, 2),
    );
  });

  it("exits cleanly with valid inputs", () => {
    expect(() =>
      execFileSync("npx", ["-y", "ts-node", script, cfgPath, "--dry-run"], {
        env: {
          ...process.env,
          CF_API_TOKEN: "token",
          CF_ZONE_ID: "zone",
          CF_ACCOUNT_ID: "account",
        },
      }),
    ).not.toThrow();
  });

  it("fails with informative error when env vars are missing", () => {
    const res = spawnSync(
      "npx",
      ["-y", "ts-node", script, cfgPath, "--dry-run"],
      {
        env: { ...process.env },
        encoding: "utf-8",
      },
    );
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/Missing required/);
  });
});
