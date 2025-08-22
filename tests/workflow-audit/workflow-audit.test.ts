import path from "node:path";
import { describe, it, expect } from "vitest";
import { lintWorkflow } from "../../scripts/ci/workflow-audit";

const f = (name: string) => path.join(__dirname, "fixtures", name);

describe("workflow-audit", () => {
  it("accepts valid workflow", () => {
    expect(lintWorkflow(f("valid.yml"))).toHaveLength(0);
  });

  it("rejects nested runs-on", () => {
    const errs = lintWorkflow(f("runs-on-nested.yml"));
    expect(errs.some((e) => e.message.includes("runs-on"))).toBe(true);
  });

  it("rejects env context", () => {
    const errs = lintWorkflow(f("env-disallowed.yml"));
    expect(errs.some((e) => e.message.includes("disallowed context"))).toBe(
      true,
    );
  });

  it("rejects extra keys on reusable call", () => {
    const errs = lintWorkflow(f("reusable-job-extra-key.yml"));
    expect(errs.some((e) => e.message.includes("disallowed key"))).toBe(true);
  });

  it("rejects unlisted runner label", () => {
    const errs = lintWorkflow(f("custom-label-unlisted.yml"));
    expect(errs.some((e) => e.message.includes("unknown runner label"))).toBe(
      true,
    );
  });

  it("detects stray block", () => {
    const errs = lintWorkflow(f("non-yaml-block.yml"));
    expect(errs.some((e) => e.message.includes("stray"))).toBe(true);
  });

  it("detects single quoted expressions", () => {
    const errs = lintWorkflow(f("single-quotes.yml"));
    expect(
      errs.some((e) => e.message.includes("expression in single quotes")),
    ).toBe(true);
  });

  it("requires permissions", () => {
    const errs = lintWorkflow(f("missing-permissions.yml"));
    expect(errs.some((e) => e.message.includes("permissions"))).toBe(true);
  });

  it("flags bad concurrency keys", () => {
    const errs = lintWorkflow(f("concurrency-bad.yml"));
    expect(
      errs.some((e) => e.message.includes("invalid concurrency key")),
    ).toBe(true);
  });
});
