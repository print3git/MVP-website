import { describe, test, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

describe("ci-inventory", () => {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const workflowsDir = path.join(repoRoot, ".github", "workflows");
  const targets = [
    "ci-canary.yml",
    "ci-burst-probe.yml",
    "ci-aws-sanity.yml",
    "ci-runner-labels.yml",
  ];

  targets.forEach((file) => {
    test(`${file} workflow`, () => {
      const full = path.join(workflowsDir, file);
      const raw = readFileSync(full, "utf8");
      const data = parse(raw);
      expect(data).toBeTruthy();
      expect(data.on).toHaveProperty("push");
      expect(data.on).toHaveProperty("pull_request");
      const jobs = data.jobs ?? {};
      const jobKeys = Object.keys(jobs);
      expect(jobKeys.length).toBeGreaterThan(0);
      jobKeys.forEach((k) => {
        expect(jobs[k]["runs-on"]).toBeTruthy();
      });
      const steps = jobKeys.flatMap((k) => jobs[k].steps || []);
      const hasCheckout = steps.some(
        (s) =>
          typeof s.uses === "string" &&
          s.uses.startsWith("actions/checkout@v4"),
      );
      expect(hasCheckout).toBe(true);
    });
  });

  test("no workflow is workflow_dispatch only", () => {
    targets.forEach((file) => {
      const raw = readFileSync(path.join(workflowsDir, file), "utf8");
      const data = parse(raw);
      const triggers = Object.keys(data.on || {});
      expect(triggers).not.toEqual(["workflow_dispatch"]);
    });
  });

  test("workflow inventory snapshot", () => {
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith(".yml"));
    const map: Record<string, string | null> = {};
    files.forEach((f) => {
      const raw = readFileSync(path.join(workflowsDir, f), "utf8");
      try {
        const data = parse(raw);
        map[f] = data.name || "";
      } catch {
        map[f] = null;
      }
    });
    targets.forEach((f) => {
      expect(map).toHaveProperty(f);
    });
    expect(map).toMatchSnapshot();
  });
});
