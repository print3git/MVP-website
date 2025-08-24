import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  shell?: string;
  [k: string]: any;
}

interface Job {
  name?: string;
  "runs-on"?: any;
  steps?: Step[];
  strategy?: { matrix?: Record<string, any> };
}

function findFiles(root: string, filename: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === filename)
        out.push(path.relative(root, full).replace(/\\/g, "/"));
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

function jobRunsOnWindows(job: Job): boolean {
  const ro = job["runs-on"];
  if (typeof ro === "string") {
    if (/windows/i.test(ro)) return true;
    const m = ro.match(/\$\{\{\s*matrix\.([^\s}]+)\s*}}/i);
    if (m) {
      const matrix = job.strategy?.matrix?.[m[1]];
      if (Array.isArray(matrix)) return matrix.some((v) => /windows/i.test(String(v)));
    }
    return false;
  }
  if (Array.isArray(ro)) return ro.some((r) => /windows/i.test(String(r)));
  return false;
}

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const pkgFiles = findFiles(repoRoot, "package.json");
let pinnedPnpm: string | null = null;
for (const rel of pkgFiles) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8"));
    const pm = pkg.packageManager as string | undefined;
    if (pm && pm.startsWith("pnpm@")) {
      pinnedPnpm = pm.split("@")[1];
      break;
    }
  } catch {}
}

const wfFiles = fs.existsSync(workflowsDir)
  ? fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
  : [];

const errors: string[] = [];

for (const wfFile of wfFiles) {
  const wfPath = path.join(workflowsDir, wfFile);
  let wf: any;
  try {
    wf = yaml.parse(fs.readFileSync(wfPath, "utf8"));
  } catch (e: any) {
    errors.push(`${wfFile}: failed to parse - ${e.message}`);
    continue;
  }
  const jobs: Record<string, Job> = wf?.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    if (!jobRunsOnWindows(job)) continue;
    const steps = job.steps || [];
    let setupIdx = -1;
    let corepackIdx = -1;
    let prepareIdx = -1;
    let actionSetupIdx = -1;
    let verifyIdx = -1;
    let firstUseIdx = -1;
    let hasNpmCache = false;
    let pinnedWorkflow: string | null = null;
    steps.forEach((step, idx) => {
      if (step.uses && /^actions\/setup-node@v4$/i.test(step.uses)) {
        const cache = step.with?.cache;
        if (cache === "npm") hasNpmCache = true;
        const nv = step.with?.["node-version"];
        if (cache === "pnpm" && String(nv) === "20") setupIdx = idx;
      }
      if (typeof step.run === "string") {
        if (/corepack enable/i.test(step.run) && (!step.shell || /(pwsh|bash)/i.test(step.shell))) corepackIdx = idx;
        if (/corepack prepare/i.test(step.run)) {
          prepareIdx = idx;
          const m = step.run.match(/corepack prepare\s+pnpm@([^\s]+)\b/i);
          if (m) pinnedWorkflow = m[1];
        }
        if (/pnpm\s+(-v|--version)/i.test(step.run)) verifyIdx = idx;
        if (/\bpnpm(?!@)\b/.test(step.run)) {
          if (firstUseIdx === -1) firstUseIdx = idx;
        }
      }
      if (step.uses && step.uses.startsWith("pnpm/action-setup")) {
        actionSetupIdx = idx;
        const v = step.with?.version;
        if (typeof v === "string") pinnedWorkflow = v;
      }
    });

    if (firstUseIdx === -1) continue; // no pnpm usage

    const prefix = `${wfFile} > ${jobName}`;
    if (setupIdx === -1)
      errors.push(`${prefix}: missing actions/setup-node@v4 with node-version 20 and cache pnpm`);
    if (corepackIdx === -1)
      errors.push(`${prefix}: missing corepack enable step`);
    if (prepareIdx === -1 && actionSetupIdx === -1)
      errors.push(`${prefix}: missing corepack prepare or pnpm/action-setup step`);
    if (verifyIdx === -1)
      errors.push(`${prefix}: missing pnpm verification step`);
    if (verifyIdx !== -1 && firstUseIdx !== -1 && verifyIdx > firstUseIdx)
      errors.push(`${prefix} > step ${firstUseIdx + 1}: pnpm used before verification step`);
    if (hasNpmCache)
      errors.push(`${prefix}: cache:npm present in pnpm job`);
    if (pinnedPnpm && pinnedWorkflow && pinnedWorkflow !== pinnedPnpm)
      errors.push(`${prefix}: workflow pins pnpm@${pinnedWorkflow} but packageManager is pnpm@${pinnedPnpm}`);
  }
}

const summaryPath = path.join(repoRoot, "corepack-pnpm-windows-audit-summary.json");
fs.writeFileSync(summaryPath, JSON.stringify({ errors }, null, 2));

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

