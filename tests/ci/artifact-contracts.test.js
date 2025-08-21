const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("yaml");

function workflowFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => path.join(dir, f));
}

test("artifact producer/consumer contracts", () => {
  const wfDir = path.join(process.cwd(), ".github", "workflows");
  if (!fs.existsSync(wfDir)) return test.skip("no workflows");
  const produced = new Set();
  const consumed = new Set();

  for (const file of workflowFiles(wfDir)) {
    const doc = yaml.parse(fs.readFileSync(file, "utf8"));
    const jobs = doc.jobs || {};
    for (const job of Object.values(jobs)) {
      const steps = job.steps || [];
      steps.forEach((step) => {
        if (step.uses && /actions\/upload-artifact/.test(step.uses)) {
          if (step.with && step.with.name) produced.add(String(step.with.name));
        }
        if (step.uses && /actions\/download-artifact/.test(step.uses)) {
          if (step.with && step.with.name) consumed.add(String(step.with.name));
        }
      });
    }
  }

  const missing = [...consumed].filter((n) => !produced.has(n));
  if (missing.length) {
    assert.fail(
      `Artifact consumed but never produced: ${missing.join(", ")}. Ensure corresponding upload-artifact steps exist.`,
    );
  }
});
