import { describe, test, expect } from "vitest";
import { getUnexpectedSkippedJobs } from "../../scripts/ci/skip-detection-audit";

describe("skip-detection-audit", () => {
  test("Job runs successfully → pass", () => {
    const jobs = [{ name: "build", conclusion: "success" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual([]);
  });

  test("Job fails → pass (not considered skip)", () => {
    const jobs = [{ name: "test", conclusion: "failure" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual([]);
  });

  test("Job skipped but appears in allowed list → pass", () => {
    const jobs = [{ name: "deploy-production", conclusion: "skipped" }];
    expect(getUnexpectedSkippedJobs(jobs, ["deploy-production"])).toEqual([]);
  });

  test("Job skipped not in allowed list → fail", () => {
    const jobs = [{ name: "lint", conclusion: "skipped" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual(["lint"]);
  });

  test("Multiple jobs run/skipped → correct ones flagged", () => {
    const jobs = [
      { name: "build", conclusion: "success" },
      { name: "deploy-production", conclusion: "skipped" },
      { name: "lint", conclusion: "skipped" },
    ];
    expect(getUnexpectedSkippedJobs(jobs, ["deploy-production"])).toEqual([
      "lint",
    ]);
  });

  test("Conditional job (if: false) → fail unless allowed", () => {
    const jobs = [{ name: "conditional", conclusion: "skipped" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual(["conditional"]);
  });

  test("Aggregate job with if: always() runs even if upstream failed → pass", () => {
    const jobs = [
      { name: "unit", conclusion: "failure" },
      { name: "aggregate", conclusion: "success" },
    ];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual([]);
  });

  test("Manual-only workflow not triggered → not flagged", () => {
    const jobs: any[] = [];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual([]);
  });

  test("Skip due to missing dependency (needs:) → flagged fail", () => {
    const jobs = [{ name: "e2e", conclusion: "skipped" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual(["e2e"]);
  });

  test("Skip due to event type mismatch (branch condition) → flagged fail", () => {
    const jobs = [{ name: "branch-check", conclusion: "skipped" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual(["branch-check"]);
  });

  test("Skip + reason annotated in job summary → pass", () => {
    const jobs = [{ name: "docs", conclusion: "success" }];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual([]);
  });

  test("End-to-end: simulate a matrix build with one skip, one fail, one pass → audit reports correctly", () => {
    const jobs = [
      { name: "test (node 18)", conclusion: "skipped" },
      { name: "test (node 20)", conclusion: "failure" },
      { name: "test (node 22)", conclusion: "success" },
    ];
    expect(getUnexpectedSkippedJobs(jobs, [])).toEqual(["test (node 18)"]);
  });
});
