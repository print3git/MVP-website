import { spawnSync } from "child_process";

describe("coverage and test run", () => {
  test("jest reports enough tests and coverage", () => {
    const result = spawnSync("npm", ["test", "--", "--json", "--coverage"], {
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    const data = JSON.parse(result.stdout || "{}");
    expect(data.numTotalTests).toBeGreaterThanOrEqual(1300);
    const coverage = data.coverageMap;
    const summary = coverage?.total ?? {};
    const lines = summary.lines?.pct ?? 0;
    const branches = summary.branches?.pct ?? 0;
    const functions = summary.functions?.pct ?? 0;
    expect(lines).toBeGreaterThanOrEqual(80);
    expect(branches).toBeGreaterThanOrEqual(80);
    expect(functions).toBeGreaterThanOrEqual(80);
  });
});
