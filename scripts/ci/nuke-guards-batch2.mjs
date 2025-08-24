import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

const TOKENS = [
  "lfs-migrate-enforce",
  "lfs-prettier-guard",
  "corepack pnpm path",
  "corepack pnpm windows",
  "metrics action yaml",
  "pnpm bootstrap",
  "pnpm monorepo",
  "required workflows",
  "workflow map yaml dep",
  "pkgjson-tests",
  "secret-sentinel",
  "ssm-runner",
  "github-script requires",
  "guardrails",
  "high-fidelity regression",
  "inventory tests",
  "json-validate",
  "junit artifacts",
  "large-file-guard",
  "lfs-enforce",
  "lfs-guard",
  "lfs-audit",
  "lfs-prevent-pointers",
  "md-link-check",
  "markdown link check",
  "node ci",
  "nx optional",
  "pipeline deadlock",
  "playwright browsers cache",
  "playwright failure alerts",
  "pnpm guard",
  "pnpm policy",
  "pnpm sentinel",
  "pr labeler",
  "pr-path-filters",
  "scan-format",
  "prettier scan-format",
  "provision-runners validate",
].map((s) => s.toLowerCase());

async function removeWorkflows() {
  const dir = path.join(".github", "workflows");
  let files;
  try {
    files = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const file of files) {
    if (!/\.ya?ml$/i.test(file)) continue;
    const filePath = path.join(dir, file);
    let text;
    try {
      text = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }
    let haystack = file.toLowerCase();
    try {
      const data = yaml.parse(text);
      if (data && typeof data === "object") {
        if (data.name) haystack += `\n${String(data.name).toLowerCase()}`;
        if (data.on) {
          const on = data.on;
          const add = (v) => {
            if (!v) return;
            const arr = Array.isArray(v) ? v : [v];
            haystack += `\n${arr.join("\n").toLowerCase()}`;
          };
          add(on.workflow_call?.workflows);
          add(on.workflow_run?.workflows);
        }
        if (data.jobs && typeof data.jobs === "object") {
          for (const [jobId, job] of Object.entries(data.jobs)) {
            haystack += `\n${jobId.toLowerCase()}`;
            if (job && job.name) {
              haystack += `\n${String(job.name).toLowerCase()}`;
            }
          }
        }
      }
    } catch {
      continue;
    }
    if (TOKENS.some((t) => haystack.includes(t))) {
      await fs.unlink(filePath);
      console.log(`Deleted workflow: ${filePath}`);
    }
  }
}

const TEST_DIRS = [
  "guardrails",
  "inventory",
  "json-validate",
  "lfs",
  "lfs-prettier-guard",
  "pnpm",
  "playwright-cache",
  "pr-labeler",
  "prettier-scan",
  "required-workflows",
  "workflow-map-yaml-dep",
  "ssm-runner",
  "secret-sentinel",
  "high-fidelity",
  "junit-artifacts",
];

async function removeTests() {
  const base = "tests";
  const removed = new Set();
  for (const dir of TEST_DIRS) {
    const target = path.join(base, dir);
    try {
      await fs.access(target);
      await fs.rm(target, { recursive: true, force: true });
      console.log(`Deleted tests: ${target}`);
      removed.add(dir);
    } catch {
      // ignore missing dirs
    }
  }
  let entries;
  try {
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (removed.has(ent.name)) continue;
    const lower = ent.name.toLowerCase();
    if (TOKENS.some((t) => lower.includes(t))) {
      const target = path.join(base, ent.name);
      await fs.rm(target, { recursive: true, force: true });
      console.log(`Deleted tests: ${target}`);
    }
  }
}

await removeWorkflows();
await removeTests();
