#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const workflowsDir = path.join(__dirname, "..", ".github", "workflows");
const neutralize = process.argv.includes("--neutralize");

const tokens = [
  "actionlint",
  "action-validators",
  "actions-ci-lint",
  "composite-schema-check",
  "affected-builds",
  "auto_rebase_merge_queue",
  "automerge",
  "automation sanity",
  "aws-",
  "binary scan",
  "build-artifacts",
  "build and artifacts",
  "cache primer",
  "cf-pages-build guard",
  "check watchdog",
  "ci canary",
  "ci start latency",
  "ci gate",
  "ci inventory",
  "ci metrics",
  "ci secrets audit",
  "ci sparse",
  "ci tools smoke",
  "external tool dependency guard",
  "github-script lint",
  "codeql",
  "dependency-review",
  "deploy pages artifact",
  "docs automerge",
  "ec2 connect diagnose",
  "ensure server boots",
  "boot_check",
  "frontend noop",
  "frontend dry build",
  "frontend smoke artifact guard",
  "full ci aggregate",
  "full lane sentry",
  "full pipeline smoke test",
  "go ci with cache",
  "guard",
  "pnpm guard",
  "pnpm install smoke",
  "rebase queue",
  "merge queue",
  "runner parity",
  "runner probe",
  "test census",
  "drift auditor",
  "terraform validate",
  "web-matrix",
  "rust scacche",
  "debug queue",
];

const removed = [];
for (const file of fs.readdirSync(workflowsDir)) {
  if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
  const filePath = path.join(workflowsDir, file);
  const content = fs.readFileSync(filePath, "utf8");
  let workflowName = "";
  try {
    const doc = yaml.parse(content);
    workflowName = doc && doc.name ? String(doc.name) : "";
  } catch {}
  const lcFilename = file.toLowerCase();
  const lcName = workflowName.toLowerCase();
  if (tokens.some((t) => lcFilename.includes(t) || lcName.includes(t))) {
    removed.push({ file, name: workflowName });
    if (neutralize) {
      let doc;
      try {
        doc = yaml.parse(content) || {};
      } catch {
        doc = {};
      }
      doc.on = { push: [], pull_request: [] };
      const newContent = "# disabled by ci-prune\n" + yaml.stringify(doc);
      fs.writeFileSync(filePath, newContent);
    } else {
      fs.unlinkSync(filePath);
    }
  }
}

const logPath = path.join(__dirname, "ci-prune-log.md");
const lines = removed.map(
  (r) =>
    `- ${neutralize ? "neutralized" : "removed"} ${r.file}: ${r.name || "(no name)"}`,
);
fs.writeFileSync(logPath, lines.join("\n") + "\n");
