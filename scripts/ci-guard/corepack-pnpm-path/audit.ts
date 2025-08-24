import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  ["working-directory"]?: string;
}

interface Job {
  steps?: Step[];
}

function findFiles(root: string, filename: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".git"))
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === filename) {
        out.push(path.relative(root, full).replace(/\\/g, "/"));
      }
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const packageJsons = findFiles(repoRoot, "package.json");
const versionSet = new Set<string>();
for (const rel of packageJsons) {
  const pkgPath = path.join(repoRoot, rel);
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (
      typeof pkg.packageManager === "string" &&
      pkg.packageManager.startsWith("pnpm@")
    ) {
      const v = pkg.packageManager.slice(5);
      versionSet.add(v);
    }
  } catch {
    // ignore
  }
}

const errors: string[] = [];
const wfFiles = fs.existsSync(workflowsDir)
  ? fs
      .readdirSync(workflowsDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  : [];

for (const wfFile of wfFiles) {
  const wfPath = path.join(workflowsDir, wfFile);
  let wf: any;
  try {
    wf = yaml.parse(fs.readFileSync(wfPath, "utf8"));
  } catch (e: any) {
    errors.push(`${wfFile}: failed to parse - ${e.message}`);
    continue;
  }
  const jobs: Record<string, Job> = wf.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    const steps = job.steps || [];
    let setupIdx = -1;
    let setupVersionOk = false;
    let corepackIdx = -1;
    let fallbackIdx = -1;
    let fallbackVersion: string | undefined;
    let hasNpmCache = false;

    steps.forEach((step, idx) => {
      if (step.uses && /actions\/setup-node@v4/.test(step.uses)) {
        setupIdx = idx;
        const nv = step.with?.["node-version"];
        setupVersionOk = nv === 20 || nv === "20";
        if (step.with?.cache === "npm") hasNpmCache = true;
      }
      if (typeof step.run === "string" && step.run.includes("corepack enable")) {
        corepackIdx = idx;
      }
      if (typeof step.run === "string" && step.run.includes("corepack prepare")) {
        fallbackIdx = idx;
        const m = step.run.match(/corepack prepare\s+pnpm@([\w.-]+)/);
        if (m) fallbackVersion = m[1];
      }
      if (step.uses && step.uses.startsWith("pnpm/action-setup")) {
        fallbackIdx = idx;
        const v = step.with?.version;
        if (typeof v === "string") fallbackVersion = v;
      }
      if (step.with?.cache === "npm") hasNpmCache = true;
    });

    steps.forEach((step, idx) => {
      if (typeof step.run !== "string" || !/\bpnpm\b/.test(step.run)) return;
      const prefix = `${wfFile} > ${jobName} > step ${idx + 1}`;
      if (setupIdx < 0 || idx <= setupIdx) {
        errors.push(`${prefix}: missing actions/setup-node@v4 before pnpm`);
      } else if (!setupVersionOk) {
        errors.push(`${prefix}: actions/setup-node must use node-version 20`);
      }
      if (corepackIdx < 0 || idx <= corepackIdx || corepackIdx <= setupIdx) {
        errors.push(`${prefix}: missing corepack enable before pnpm`);
      }
      if (
        fallbackIdx < 0 ||
        idx <= fallbackIdx ||
        fallbackIdx <= corepackIdx
      ) {
        errors.push(
          `${prefix}: missing corepack prepare or pnpm/action-setup before pnpm`,
        );
      }
      if (hasNpmCache) {
        errors.push(`${wfFile} > ${jobName}: cache: npm present in job using pnpm`);
      }
      if (fallbackVersion && versionSet.size > 0 && !versionSet.has(fallbackVersion)) {
        const pinned = Array.from(versionSet).join(", ");
        errors.push(
          `${wfFile} > ${jobName} > step ${fallbackIdx + 1}: pnpm version ${fallbackVersion} conflicts with packageManager pnpm@${pinned}`,
        );
      }
    });
  }
}

if (versionSet.size > 1) {
  errors.push(
    `conflicting packageManager pnpm versions: ${Array.from(versionSet).join(", ")}`,
  );
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

