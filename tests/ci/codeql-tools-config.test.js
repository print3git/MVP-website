const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function walk(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
    .map((f) => path.join(dir, f));
}

test("CodeQL tools config", () => {
  const wfDir = path.join(process.cwd(), ".github", "workflows");
  if (!fs.existsSync(wfDir)) return test.skip("no workflows");
  const yaml = require("yaml");
  const bad = [];
  for (const file of walk(wfDir)) {
    const doc = yaml.parse(fs.readFileSync(file, "utf8"));
    const jobs = doc.jobs || {};
    for (const job of Object.values(jobs)) {
      const steps = job.steps || [];
      steps.forEach((step) => {
        if (step.uses && /github\/codeql-action\/init/.test(step.uses)) {
          const tools = step.with && step.with.tools;
          if (tools && !/\.(tar\.gz|tar\.zst)$/.test(tools)) {
            bad.push(`${file} -> ${tools}`);
          }
        }
      });
    }
  }
  if (bad.length) {
    assert.fail(
      `CodeQL tools misconfig: ${bad.join(", ")}. Fix: remove tools: or use an official bundle URL; do not set tools: 2.22.4.`,
    );
  }
});
