import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { audit } from "../../scripts/ci-gate/audit";

function writeWorkflow(yaml: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-"));
  const wfDir = path.join(dir, ".github", "workflows");
  fs.mkdirSync(wfDir, { recursive: true });
  fs.writeFileSync(path.join(wfDir, "ci-fast-lane.yml"), yaml);
  return dir;
}

const valid = `
name: CI Fast Lane
on: { pull_request: {} }
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      backend: \${{ steps.changes.outputs.backend }}
      frontend: \${{ steps.changes.outputs.frontend }}
      _any: \${{ steps.changes.outputs._any }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: changes
        run: echo
  backend:
    if: needs.changes.outputs.backend == 'true' || needs.changes.outputs._any == 'true'
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - run: echo backend
  frontend:
    if: needs.changes.outputs.frontend == 'true' || needs.changes.outputs._any == 'true'
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - run: echo frontend
`;

describe("ci-gate audit", () => {
  it("ci-gate passes valid workflow", () => {
    const dir = writeWorkflow(valid);
    const result = audit(dir);
    expect(result.ok).toBe(true);
    expect(result.lanes).toContain("backend");
    expect(result.lanes).toContain("frontend");
  });

  it("ci-gate fails when changes job missing", () => {
    const yaml = `name: CI Fast Lane\njobs: {}`;
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(res.errors[0]).toMatch(/changes job missing/);
  });

  it("ci-gate fails on missing checkout fetch-depth", () => {
    const yaml = valid.replace("fetch-depth: 0", "");
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(res.errors).toContain("changes job must set fetch-depth: 0");
  });

  it("ci-gate fails when lane lacks needs", () => {
    const yaml = valid.replace("needs: changes\n    runs-on", "runs-on");
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("missing needs"))).toBe(true);
  });

  it("ci-gate fails on wrong if condition", () => {
    const yaml = valid.replace("|| needs.changes.outputs._any == 'true'", "");
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("fail-open"))).toBe(true);
  });

  it("ci-gate fails when _any output missing", () => {
    const yaml = valid.replace(/\n\s+_any:[^\n]+\n/, "\n");
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("'_any'"))).toBe(true);
  });

  it("ci-gate detects mass-skip when lane output undefined", () => {
    const yaml = valid.replace(/\n\s+backend:[^\n]+\n/, "\n");
    const dir = writeWorkflow(yaml);
    const res = audit(dir);
    expect(res.ok).toBe(false);
    expect(
      res.errors.some((e) => e.includes("referenced but not defined")),
    ).toBe(true);
  });

  it("ci-gate current repo workflow is audited", () => {
    const res = audit(path.join(__dirname, "..", ".."));
    expect(res.ok).toBe(false);
  });
});
