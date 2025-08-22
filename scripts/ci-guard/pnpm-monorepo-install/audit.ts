import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, any>;
  ["working-directory"]?: string;
}

interface Job {
  steps?: Step[];
  defaults?: { run?: { ["working-directory"]?: string } };
}

interface StepError {
  step: number;
  message: string;
}

interface JobSummary {
  ok: boolean;
  steps: StepError[];
}

interface FileSummary {
  ok: boolean;
  jobs: Record<string, JobSummary>;
}

interface Summary {
  ok: boolean;
  files: Record<string, FileSummary>;
}

function toPosix(p: string): string {
  return path.posix.normalize(p.replace(/\\/g, "/"));
}

function findPackageRoots(root: string): Set<string> {
  const out = new Set<string>();
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".git")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name === "package.json") {
        const rel = path.relative(root, path.dirname(full)) || ".";
        out.add(toPosix(rel));
      }
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

function hasNode20(step: Step): boolean {
  const v = step.with?.["node-version"];
  if (typeof v !== "string") return false;
  if (v.includes("${{")) return true;
  return v.includes("20");
}

export function auditFiles(files: string[], repoRoot = process.cwd()): Summary {
  const pkgRoots = findPackageRoots(repoRoot);
  const summary: Summary = { ok: true, files: {} };
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const doc = yaml.parse(content) || {};
    const wfDefault = doc.defaults?.run?.["working-directory"];
    const jobs = doc.jobs || {};
    const fileSummary: FileSummary = { ok: true, jobs: {} };
    for (const [jobName, job] of Object.entries<Job>(jobs)) {
      const steps = job.steps || [];
      const jobDefault = job.defaults?.run?.["working-directory"];
      const jobSummary: JobSummary = { ok: true, steps: [] };
      let nodeIdx = -1;
      let node20 = false;
      let corepackIdx = -1;
      let pnpmSetupIdx = -1;
      let sawPnpm = false;
      let sawNpm = false;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const run = step.run || "";
        if (step.uses && /actions\/setup-node@/.test(step.uses)) {
          nodeIdx = i;
          node20 = hasNode20(step);
        }
        if (/corepack enable/.test(run)) corepackIdx = i;
        if (step.uses && step.uses.startsWith("pnpm/action-setup")) pnpmSetupIdx = i;
        if (/\bnpm\s+(ci|install)\b/.test(run)) sawNpm = true;
        if (/pnpm\s+install/.test(run)) {
          sawPnpm = true;
          if (!/--frozen-lockfile/.test(run)) {
            jobSummary.steps.push({ step: i + 1, message: "pnpm install missing --frozen-lockfile" });
          }
          const dir = step["working-directory"] || jobDefault || wfDefault || ".";
          const norm = toPosix(dir);
          if (!run.includes("pnpm-monorepo-install/roots.txt") && !dir.includes("${{")) {
            if (!pkgRoots.has(norm)) {
              jobSummary.steps.push({ step: i + 1, message: `pnpm install in non-package directory: ${norm}` });
            }
          }
          if (nodeIdx < 0 || i <= nodeIdx) {
            jobSummary.steps.push({ step: i + 1, message: "missing actions/setup-node before pnpm install" });
          } else if (!node20) {
            jobSummary.steps.push({ step: i + 1, message: "actions/setup-node must use Node 20" });
          }
          if (corepackIdx < 0 || i <= corepackIdx) {
            jobSummary.steps.push({ step: i + 1, message: "missing corepack enable before pnpm install" });
          }
          if (pnpmSetupIdx < 0 || i <= pnpmSetupIdx) {
            jobSummary.steps.push({ step: i + 1, message: "missing pnpm/action-setup before pnpm install" });
          }
        }
      }
      if (sawPnpm && sawNpm) {
        jobSummary.steps.push({ step: 0, message: "mixed npm and pnpm installs in job" });
      }
      if (jobSummary.steps.length) {
        jobSummary.ok = false;
        fileSummary.ok = false;
        summary.ok = false;
      }
      fileSummary.jobs[jobName] = jobSummary;
    }
    summary.files[file] = fileSummary;
  }
  return summary;
}

function main() {
  const repoRoot = process.cwd();
  const args = process.argv.slice(2);
  let files: string[];
  if (args.length) {
    files = args;
  } else {
    const wfDir = path.join(repoRoot, ".github", "workflows");
    files = fs
      .readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((f) => path.join(wfDir, f));
  }
  const summary = auditFiles(files, repoRoot);
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exit(1);
}

if (require.main === module) {
  main();
}
