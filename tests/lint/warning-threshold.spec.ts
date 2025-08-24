import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function runEslint(cwd: string) {
  return spawnSync("npx", ["eslint", ".", "--format", "json"], {
    cwd,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

describe("eslint warning threshold", () => {
  it("root warnings stay under limit", () => {
    const result = runEslint(path.resolve(__dirname, "../.."));
    expect(result.status).toBe(0);
    const reports = JSON.parse(result.stdout || "[]");
    const totalWarnings = reports.reduce(
      (sum: number, r: any) => sum + (r.warningCount || 0),
      0,
    );
    expect(totalWarnings).toBeLessThanOrEqual(25);
  });

  const backendDir = path.resolve(__dirname, "../../backend");
  if (existsSync(backendDir)) {
    it("backend warnings stay under limit", () => {
      const result = runEslint(backendDir);
      expect(result.status).toBe(0);
      const reports = JSON.parse(result.stdout || "[]");
      const totalWarnings = reports.reduce(
        (sum: number, r: any) => sum + (r.warningCount || 0),
        0,
      );
      expect(totalWarnings).toBeLessThanOrEqual(25);
    });
  } else {
    it.skip("backend directory missing", () => {});
  }
});
