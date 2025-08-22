#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
let YAML;
try {
  YAML = require("yaml");
} catch (e) {
  console.error(
    'Missing "yaml" module. Ensure devDependencies are installed before running this script.',
  );
  process.exit(2);
}

const repoRoot = path.resolve(__dirname, "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const keywords = /lint|unit|e2e|frontend|backend|docs|typecheck|smoke/i;

function patternToRegex(p) {
  let s = p.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  s = s.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp("^" + s + "$");
}

function listFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out);
    else out.push(path.relative(repoRoot, full).replace(/\\/g, "/"));
  }
  return out;
}

const allFiles = listFiles(repoRoot);
const jobs = [];
for (const file of fs.readdirSync(workflowsDir)) {
  if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
  let doc;
  try {
    doc = YAML.parse(fs.readFileSync(path.join(workflowsDir, file), "utf8"));
  } catch {
    continue;
  }
  if (!doc || !doc.jobs) continue;
  for (const [id, job] of Object.entries(doc.jobs)) {
    const name = job.name || id;
    if (!keywords.test(name)) continue;
    const globs = new Set();
    const steps = job.steps || [];
    for (const step of steps) {
      if (typeof step.run === "string") {
        const m = step.run.match(
          /([^\s'"\)]+\.(?:test|spec)\.(?:js|jsx|ts|tsx)|[^\s'"\)]+tests[^\s'"\)]*|e2e\/[^\s'"\)]*)/g,
        );
        if (m) m.forEach((x) => globs.add(x));
        if (/--workspaces/.test(step.run)) globs.add("**/*");
      }
      if (step.with) {
        if (typeof step.with.path === "string") globs.add(step.with.path);
        if (Array.isArray(step.with.paths))
          step.with.paths.forEach((p) => globs.add(p));
      }
    }
    const paths = [];
    const incl =
      job.strategy && job.strategy.matrix && job.strategy.matrix.include;
    if (Array.isArray(incl)) {
      for (const item of incl) {
        if (item.paths) {
          if (Array.isArray(item.paths)) paths.push(...item.paths);
          else paths.push(item.paths);
        }
        if (item.path) paths.push(item.path);
      }
    }
    jobs.push({
      id,
      name,
      globs: Array.from(globs),
      ifExpr: job.if || null,
      paths,
    });
  }
}

const unmatched = [];
for (const pattern of new Set(jobs.flatMap((j) => j.globs))) {
  const rx = patternToRegex(pattern);
  if (!allFiles.some((f) => rx.test(f))) unmatched.push(pattern);
}

console.log(JSON.stringify({ jobs, uncoveredPatterns: unmatched }, null, 2));
