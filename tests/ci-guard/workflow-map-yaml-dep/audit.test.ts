import fs from "fs";
import path from "path";
import { runMapper } from "../../../scripts/ci-guard/workflow-map-yaml-dep/audit";

describe("workflow-map yaml dependency audit", () => {
  test("t1: yaml installed -> produces JSON with top-level keys", () => {
    const res = runMapper();
    expect(res.code).toBe(0);
    const obj = JSON.parse(res.stdout);
    expect(obj).toHaveProperty("jobs");
    expect(obj).toHaveProperty("uncoveredPatterns");
  });

  test("t2: missing yaml exits with code 2", () => {
    const res = runMapper({ noYaml: true });
    expect(res.code).toBe(2);
    expect(res.stderr).toMatch(/Cannot find module 'yaml'/);
  });

  test("t3: runs-on array parsed", () => {
    const workflow = `name: t\non: push\njobs:\n  unit:\n    runs-on:\n      - ubuntu-latest\n      - macos-latest\n    steps:\n      - run: node tests/sample.test.js\n`;
    const res = runMapper({ workflow });
    const obj = JSON.parse(res.stdout);
    expect(obj.jobs.length).toBeGreaterThan(0);
  });

  test("t4: comments and anchors parsed", () => {
    const workflow = `name: t\non: push\njobs:\n  unitA: &base\n    runs-on: ubuntu-latest # comment\n    steps:\n      - run: node tests/sample.test.js\n  unitB:\n    <<: *base\n`;
    const res = runMapper({ workflow });
    const obj = JSON.parse(res.stdout);
    expect(obj.jobs.length).toBe(2);
  });

  test("t5: malformed workflow triggers failure", () => {
    const res = runMapper({
      workflow: "name: bad\njobs:\n  build:\n    runs-on: [",
      malformed: true,
    });
    expect(res.code).not.toBe(0);
    expect(res.stderr).toMatch(/fail/);
  });

  test("t6: empty directory yields empty map", () => {
    const res = runMapper({ empty: true });
    expect(res.code).toBe(0);
    const obj = JSON.parse(res.stdout);
    expect(obj.jobs).toEqual([]);
  });

  test("t7: large repo completes quickly", () => {
    const res = runMapper({ files: 100 });
    expect(res.code).toBe(0);
    expect(res.time).toBeLessThan(2000);
  });

  test("t8: windows path separators normalized", () => {
    const workflow = `name: t\non: push\njobs:\n  unit:\n    runs-on: ubuntu-latest\n    steps:\n      - run: node tests\\sample.test.js\n`;
    const res = runMapper({ workflow });
    expect(res.stdout).not.toContain("\\\\");
  });

  test("t9: UTF-8 BOM files parsed", () => {
    const res = runMapper({ bom: true });
    const obj = JSON.parse(res.stdout);
    expect(obj.jobs.length).toBeGreaterThan(0);
  });

  test("t10: expressions preserved as strings", () => {
    const workflow = `name: t\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo \${{ github.ref }}\n`;
    const res = runMapper({ workflow });
    expect(res.code).toBe(0);
  });

  test("t11: stdout redirection to file works", () => {
    const res = runMapper({ redirect: true });
    const file = fs.readFileSync(
      path.join(res.dir, "ci-workflow-map.json"),
      "utf8",
    );
    const obj = JSON.parse(file);
    expect(obj).toHaveProperty("jobs");
  });

  test("t12: summary artifact records count", () => {
    const res = runMapper();
    const obj = JSON.parse(res.stdout);
    const summary = path.join(res.dir, "summary.txt");
    fs.writeFileSync(summary, `records: ${obj.jobs.length}`);
    const out = fs.readFileSync(summary, "utf8");
    expect(out).toContain(String(obj.jobs.length));
  });
});
