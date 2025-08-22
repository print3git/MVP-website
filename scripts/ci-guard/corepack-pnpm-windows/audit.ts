import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  shell?: string;
  ["working-directory"]?: string;
}

interface Job {
  [key: string]: any;
  steps?: Step[];
  defaults?: { run?: { ["working-directory"]?: string } };
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

function hasWindows(value: any): boolean {
  if (typeof value === "string") return /windows/i.test(value);
  if (Array.isArray(value)) return value.some(hasWindows);
  return false;
}

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const lockFiles = findFiles(repoRoot, "pnpm-lock.yaml");
const packageJsons = findFiles(repoRoot, "package.json");
const pnpmPackages = new Map<string, string>();
for (const rel of packageJsons) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8"));
    const pm = pkg.packageManager;
    if (typeof pm === "string" && pm.startsWith("pnpm@")) {
      const dir = path.posix.dirname(rel) || ".";
      pnpmPackages.set(dir, pm.slice("pnpm@".length));
    }
  } catch {}
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
  const wfDefaultDir = wf?.defaults?.run?.["working-directory"];
  const jobs: Record<string, Job> = wf.jobs || {};
  for (const [jobName, job] of Object.entries(jobs)) {
    let isWindows = false;
    if (hasWindows(job["runs-on"])) isWindows = true;
    const matrixOs = job.strategy?.matrix?.os;
    if (hasWindows(matrixOs)) isWindows = true;
    if (!isWindows) continue;

    const steps: Step[] = job.steps || [];
    const jobDefaultDir = job.defaults?.run?.["working-directory"];
    let setupIndex = -1;
    let cachePaths: string[] = [];
    let corepackIndex = -1;
    let prepareIndex = -1;
    let prepareVersion: string | undefined;
    let actionSetupIndex = -1;
    let actionSetupVersion: string | undefined;
    let verifyIndex = -1;
    let hasNpmCache = false;

    steps.forEach((step, idx) => {
      if (step.uses && /actions\/setup-node@v4/.test(step.uses)) {
        const cache = step.with?.cache;
        if (
          cache === "pnpm" &&
          (step.with?.["node-version"] === 20 ||
            step.with?.["node-version"] === "20")
        ) {
          setupIndex = idx;
          const dep = step.with?.["cache-dependency-path"];
          if (typeof dep === "string") {
            cachePaths = dep
              .split(/\n|,/)
              .map((s: string) => s.trim())
              .filter(Boolean);
          }
        }
        if (cache === "npm") hasNpmCache = true;
      }
      if (
        typeof step.run === "string" &&
        step.run.includes("corepack enable")
      ) {
        corepackIndex = idx;
      }
      if (
        typeof step.run === "string" &&
        step.run.includes("corepack prepare")
      ) {
        prepareIndex = idx;
        const m = step.run.match(/corepack prepare pnpm@([^\s]+)/);
        if (m) prepareVersion = m[1];
      }
      if (step.uses && step.uses.startsWith("pnpm/action-setup")) {
        actionSetupIndex = idx;
        const v = step.with?.version;
        if (typeof v === "string") actionSetupVersion = v;
      }
      if (
        typeof step.run === "string" &&
        /\bpnpm\b/.test(step.run) &&
        /(?:--version|-v)\b/.test(step.run)
      ) {
        verifyIndex = idx;
      }
    });

    const lastSetupIdx = Math.max(prepareIndex, actionSetupIndex);

    steps.forEach((step, idx) => {
      const run = step.run;
      if (typeof run !== "string") return;
      if (!/\bpnpm\b/.test(run)) return;
      if (/corepack prepare/.test(run)) return;
      if (/(?:--version|-v)\b/.test(run)) return;
      const prefix = `${wfFile} > ${jobName} > step ${idx + 1}`;
      if (setupIndex < 0 || idx <= setupIndex) {
        errors.push(
          `${prefix}: missing actions/setup-node@v4 (node 20 with cache pnpm) before pnpm`,
        );
      } else {
        if (
          cachePaths.length !== lockFiles.length ||
          lockFiles.some((lf) => !cachePaths.includes(lf))
        ) {
          errors.push(
            `${wfFile} > ${jobName}: cache-dependency-path must include all pnpm-lock.yaml files`,
          );
        }
      }
      if (corepackIndex < 0 || idx <= corepackIndex) {
        errors.push(`${prefix}: missing corepack enable before pnpm`);
      }
      if (lastSetupIdx < 0 || idx <= lastSetupIdx) {
        errors.push(
          `${prefix}: missing corepack prepare or pnpm/action-setup before pnpm`,
        );
      }
      if (verifyIndex < 0 || idx <= verifyIndex) {
        errors.push(`${prefix}: missing pnpm --version before pnpm`);
      }
      if (hasNpmCache) {
        errors.push(`${prefix}: cache: npm present in job using pnpm`);
      }
      const stepDir =
        step["working-directory"] || jobDefaultDir || wfDefaultDir || ".";
      const normDir = path.posix.normalize(stepDir);
      const pkgVersion = pnpmPackages.get(normDir) || pnpmPackages.get(".");
      const pinned = prepareVersion || actionSetupVersion;
      if (pkgVersion && pinned && pkgVersion !== pinned) {
        errors.push(
          `${wfFile} > ${jobName}: pnpm version ${pinned} conflicts with package.json ${pkgVersion}`,
        );
      }
    });
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
