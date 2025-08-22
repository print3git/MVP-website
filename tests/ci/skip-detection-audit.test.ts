import { describe, it, expect } from "vitest";
import { auditSkips, Job } from "../../scripts/ci/skip-detection-audit";

describe("skip-detection-audit", () => {
  it("Job runs successfully → pass", () => {
    const jobs: Job[] = [{ name: "build", conclusion: "success" }];
    expect(auditSkips(jobs, [])).toEqual([]);
  });

  it("Job fails → pass (not considered skip)", () => {
    const jobs: Job[] = [{ name: "build", conclusion: "failure" }];
    expect(auditSkips(jobs, [])).toEqual([]);
  });

  it("Job skipped but appears in allowed list → pass", () => {
    const jobs: Job[] = [{ name: "deploy-production", conclusion: "skipped" }];
    expect(auditSkips(jobs, ["deploy-production"])).toEqual([]);
  });

  it("Job skipped not in allowed list → fail", () => {
    const jobs: Job[] = [{ name: "lint", conclusion: "skipped" }];
    expect(auditSkips(jobs, [])).toEqual(["lint"]);
  });

  it("Multiple jobs run/skipped → correct ones flagged", () => {
    const jobs: Job[] = [
      { name: "build", conclusion: "success" },
      { name: "lint", conclusion: "skipped" },
      { name: "deploy-production", conclusion: "skipped" },
    ];
    expect(auditSkips(jobs, ["deploy-production"])).toEqual(["lint"]);
  });

  it("Conditional job (if: false) → fail unless allowed", () => {
    const jobs: Job[] = [{ name: "conditional", conclusion: "skipped" }];
    expect(auditSkips(jobs, [])).toEqual(["conditional"]);
  });

  it("Aggregate job with if: always() runs even if upstream failed → pass", () => {
    const jobs: Job[] = [
      { name: "tests", conclusion: "failure" },
      { name: "aggregate", conclusion: "success" },
    ];
    expect(auditSkips(jobs, [])).toEqual([]);
  });

  it("Manual-only workflow not triggered → not flagged", () => {
    const jobs: Job[] = [];
    expect(auditSkips(jobs, [])).toEqual([]);
  });

  it("Skip due to missing dependency (needs:) → flagged fail", () => {
    const jobs: Job[] = [{ name: "needs-job", conclusion: "skipped" }];
    expect(auditSkips(jobs, [])).toEqual(["needs-job"]);
  });

  it("Skip due to event type mismatch (branch condition) → flagged fail", () => {
    const jobs: Job[] = [{ name: "branch-job", conclusion: "skipped" }];
    expect(auditSkips(jobs, [])).toEqual(["branch-job"]);
  });

  it("Skip + reason annotated in job summary → pass", () => {
    const jobs: Job[] = [
      {
        name: "manual-approval",
        conclusion: "skipped",
        steps: [{ name: "reason", conclusion: "skipped" }],
      },
    ];
    expect(auditSkips(jobs, ["manual-approval"])).toEqual([]);
  });

  it("End-to-end: matrix build with one skip, one fail, one pass → audit reports correctly", () => {
    const jobs: Job[] = [
      { name: "build (node=18)", conclusion: "success" },
      { name: "build (node=20)", conclusion: "skipped" },
      { name: "build (node=22)", conclusion: "failure" },
    ];
    expect(auditSkips(jobs, [])).toEqual(["build (node=20)"]);
  });
});
