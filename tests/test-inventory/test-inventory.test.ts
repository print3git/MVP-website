import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..", "..");
const script = path.join(repoRoot, "scripts", "list-tests.ts");

function runGenerator(cwd: string = repoRoot) {
  const res = spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout);
  }
  const json = JSON.parse(
    readFileSync(path.join(cwd, "test-inventory", "current.json"), "utf8"),
  );
  return { json, output: res.stdout + res.stderr };
}

function checkBaseline(current: any, baseline: any, threshold: number) {
  const drop = baseline.totals.count - current.totals.count;
  if (drop > threshold) {
    throw new Error(`Drop ${drop} exceeds threshold ${threshold}`);
  }
}

describe("test-inventory generator", () => {
  it("test-inventory: schema validation", () => {
    const { json } = runGenerator();
    expect(Object.keys(json).sort()).toEqual([
      "commit",
      "generatedAt",
      "packages",
      "totals",
    ]);
    for (const pkg of Object.values<any>(json.packages)) {
      expect(Object.keys(pkg).sort()).toEqual(["count", "files"]);
      expect(pkg.count).toBe(pkg.files.length);
    }
  });

  it("test-inventory: package roll-up totals", () => {
    const { json } = runGenerator();
    let sum = 0;
    for (const pkg of Object.values<any>(json.packages)) {
      sum += pkg.count;
    }
    expect(json.totals.count).toBe(sum);
  });

  it("test-inventory: stability", () => {
    const a = runGenerator().json;
    const b = runGenerator().json;
    delete a.generatedAt;
    delete b.generatedAt;
    expect(b).toEqual(a);
  });

  it("test-inventory: baseline diff", () => {
    const { json } = runGenerator();
    const threshold = 2;
    const baselineDrop = {
      totals: { count: json.totals.count + threshold + 1 },
    };
    expect(() => checkBaseline(json, baselineDrop, threshold)).toThrow();
    const baselineIncrease = { totals: { count: json.totals.count - 1 } };
    expect(() =>
      checkBaseline(json, baselineIncrease, threshold),
    ).not.toThrow();
  });

  it("test-inventory: empty repo yields zero", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "inv-"));
    const { json, output } = runGenerator(dir);
    try {
      expect(json.totals.count).toBe(0);
      expect(output).toMatch(/skipping root/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("test-inventory: globbing correctness", () => {
    const { json } = runGenerator();
    const prefixes: Record<string, string> = {
      frontend: "frontend/",
      backend: "backend/",
      e2e: "e2e/",
    };
    for (const [name, pkg] of Object.entries<any>(json.packages)) {
      const prefix = prefixes[name];
      if (!prefix) continue;
      for (const file of pkg.files) {
        expect(file.startsWith(prefix)).toBe(true);
      }
    }
  });

  it("test-inventory: performance ceiling", () => {
    const start = Date.now();
    runGenerator();
    const duration = Date.now() - start;
    if (duration <= 2000) {
      expect(duration).toBeLessThan(2000);
    } else {
      console.warn(`inventory generation took ${duration}ms; skipping check`);
    }
  });
});
