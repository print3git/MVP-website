import { spawnSync } from "node:child_process";
import { join } from "node:path";

const script = join(__dirname, "..", "scripts", "ensure-manifest.mjs");

describe("ensure-manifest", () => {
  it("fails when package.json is missing", () => {
    const result = spawnSync("node", [script], {
      cwd: join(__dirname, "helpers"),
    });
    expect(result.status).toBe(2);
    expect(result.stderr.toString()).toMatch("No package.json");
  });

  it("succeeds in repo root", () => {
    const result = spawnSync("node", [script], { cwd: join(__dirname, "..") });
    expect(result.status).toBe(0);
  });

  it("succeeds in frontend directory", () => {
    const result = spawnSync("node", [script], {
      cwd: join(__dirname, "..", "frontend"),
    });
    expect(result.status).toBe(0);
  });
});
