const fs = require("fs");
const path = require("path");
const { minimatch } = require("minimatch");

function loadPolicy() {
  const policyPath = path.join(__dirname, "config", "autofix", "policy.json");
  return JSON.parse(fs.readFileSync(policyPath, "utf8"));
}

function enforceAutofixPolicy({
  changedFiles,
  openAutofixPRs,
  testsA = 0,
  testsB = 0,
}) {
  const policy = loadPolicy();

  if (openAutofixPRs >= policy.maxOpenAutofixPRs) {
    throw new Error("too many open autofix PRs");
  }

  for (const file of changedFiles) {
    const forbidden = policy.forbiddenPaths.some((p) =>
      p.includes("*") || p.includes("?")
        ? minimatch(file, p, { dot: true })
        : file.startsWith(p),
    );
    if (forbidden) {
      throw new Error(`changes to ${file} forbidden`);
    }
    const allowed = policy.allowedPaths.some((p) =>
      p.includes("*") || p.includes("?")
        ? minimatch(file, p, { dot: true })
        : file.startsWith(p),
    );
    if (!allowed) {
      throw new Error(`changes to ${file} not allowed`);
    }
  }

  if (policy.requireTestsForA && testsA === 0) {
    throw new Error("tests required for A");
  }

  if (testsB < policy.minTestsForB) {
    throw new Error(`at least ${policy.minTestsForB} tests required for B`);
  }
}

module.exports = { enforceAutofixPolicy, loadPolicy };
