const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) walk(path.join(dir, entry.name), files);
    else files.push(path.join(dir, entry.name));
  }
  return files;
}

test("composite actions declare shell", () => {
  const base = path.join(process.cwd(), ".github", "actions");
  if (!fs.existsSync(base)) return test.skip("no local actions");
  const files = walk(base).filter(
    (f) => f.endsWith("action.yml") || f.endsWith("action.yaml"),
  );
  const yaml = require("yaml");
  const missing = [];
  for (const file of files) {
    const doc = yaml.parse(fs.readFileSync(file, "utf8"));
    if (doc?.runs?.using !== "composite" || !Array.isArray(doc.runs.steps))
      continue;
    doc.runs.steps.forEach((step, idx) => {
      if (step.run && !step.shell) {
        missing.push(`${file} step ${idx + 1}`);
      }
    });
  }
  if (missing.length) {
    assert.fail(
      `Composite action steps missing shell: ${missing.join(", ")}. Each run step must declare a shell: bash`,
    );
  }
});
