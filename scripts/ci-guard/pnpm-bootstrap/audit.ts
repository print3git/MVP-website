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

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const lockFiles = findFiles(repoRoot, "pnpm-lock.yaml");
const packageJsons = findFiles(repoRoot, "package.json");
const pnpmPackages = new Set<string>();
for (const rel of packageJsons) {
  const pkgPath = path.join(repoRoot, rel);
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (
      typeof pkg.packageManager === "string" &&
      pkg.packageManager.startsWith("pnpm@")
    ) {
      pnpmPackages.add(path.posix.dirname(rel) || ".");
    }
  } catch {}
}

const errors: string[] = [];
const pnpmUsageDirs = new Set<string>();
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
    const steps = job.steps || [];
    let setupIndex = -1;
    let cachePaths: string[] = [];
    let corepackIndex = -1;
    let actionSetupIndex = -1;
    let actionSetupRunInstall = false;
    let hasNpmCache = false;
    const jobDefaultDir = job.defaults?.run?.["working-directory"];
    steps.forEach((step, idx) => {
      if (step.uses && /actions\/setup-node@/.test(step.uses)) {
        const cache = step.with?.cache;
        if (cache === "pnpm") {
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
      if (step.uses && step.uses.startsWith("pnpm/action-setup")) {
        actionSetupIndex = idx;
        const ri = step.with?.run_install;
        actionSetupRunInstall = ri === false || ri === "false";
      }
    });

    steps.forEach((step, idx) => {
      if (typeof step.run !== "string" || !/\bpnpm\b/.test(step.run)) return;
      const stepDir =
        step["working-directory"] || jobDefaultDir || wfDefaultDir || ".";
      const normDir = path.posix.normalize(stepDir);
      pnpmUsageDirs.add(normDir);
      const prefix = `${wfFile} > ${jobName} > step ${idx + 1}`;
      if (setupIndex < 0 || idx <= setupIndex) {
        errors.push(
          `${prefix}: missing actions/setup-node with cache:pnpm before pnpm`,
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
      if (hasNpmCache) {
        errors.push(`${prefix}: cache: npm present in job using pnpm`);
      }
      const pinned = pnpmPackages.has(normDir);
      if ((actionSetupIndex < 0 || idx <= actionSetupIndex) && !pinned) {
        errors.push(
          `${prefix}: missing pnpm/action-setup fallback or packageManager pin`,
        );
      }
      if (actionSetupIndex >= 0 && !actionSetupRunInstall) {
        errors.push(
          `${wfFile} > ${jobName} > step ${actionSetupIndex + 1}: pnpm/action-setup must set run_install:false`,
        );
      }
    });
  }
}

for (const dir of pnpmPackages) {
  if (!pnpmUsageDirs.has(dir)) {
    errors.push(
      `package.json in ${dir} pins pnpm but no workflow uses pnpm there`,
    );
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
