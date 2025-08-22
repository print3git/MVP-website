import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  with?: Record<string, any>;
}

interface Job {
  "runs-on"?: any;
  steps?: Step[];
  strategy?: any;
  if?: string;
}

function isWindows(runsOn: any, matrixOs: any): boolean {
  const test = (v: any) =>
    typeof v === "string" && v.toLowerCase().includes("windows");
  if (test(runsOn)) return true;
  if (Array.isArray(runsOn) && runsOn.some(test)) return true;
  if (
    typeof runsOn === "string" &&
    runsOn.includes("${{") &&
    Array.isArray(matrixOs)
  ) {
    return matrixOs.some(test);
  }
  return false;
}

const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const errors: string[] = [];
const warnings: string[] = [];

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
    const matrixOs = job.strategy?.matrix?.os;
    const jobIsWindows = isWindows(job["runs-on"], matrixOs);
    const lowerName = jobName.toLowerCase();

    if (/(summary|diagnostic)/.test(lowerName)) {
      if (job.if !== "always()") {
        errors.push(
          `${wfFile} > ${jobName}: summary/diagnostic jobs must use if: always()`,
        );
      }
    }

    if (jobIsWindows) {
      const steps = job.steps || [];
      let hasSetup = false;
      let hasCorepack = false;
      let hasPnpmFallback = false;

      for (const step of steps) {
        if (step.uses && /actions\/setup-node@/.test(step.uses)) {
          const nv = step.with?.["node-version"];
          const cache = step.with?.cache;
          if (
            (nv === 20 || nv === "20" || (typeof nv === "string" && nv.startsWith("20"))) &&
            cache === "pnpm"
          ) {
            hasSetup = true;
            const dep = step.with?.["cache-dependency-path"];
            if (
              typeof dep !== "string" ||
              !dep
                .split(/\n|,/)
                .map((s: string) => s.trim())
                .filter(Boolean)
                .includes("pnpm-lock.yaml")
            ) {
              warnings.push(
                `${wfFile} > ${jobName}: cache-dependency-path should include pnpm-lock.yaml`,
              );
            }
          } else {
            errors.push(
              `${wfFile} > ${jobName}: setup-node must use node-version 20 with cache:pnpm`,
            );
          }
        }
        if (typeof step.run === "string" && step.run.includes("corepack enable")) {
          hasCorepack = true;
          if (step.shell && !/pwsh/i.test(step.shell)) {
            warnings.push(
              `${wfFile} > ${jobName}: corepack enable should use pwsh shell`,
            );
          }
        }
        if (step.uses && step.uses.startsWith("pnpm/action-setup")) {
          const ri = step.with?.run_install;
          if (ri === false || ri === "false") {
            hasPnpmFallback = true;
          } else {
            errors.push(
              `${wfFile} > ${jobName}: pnpm/action-setup must set run_install:false`,
            );
          }
        }
      }

      if (!hasSetup)
        errors.push(
          `${wfFile} > ${jobName}: missing actions/setup-node with node 20 and cache:pnpm`,
        );
      if (!hasCorepack)
        errors.push(`${wfFile} > ${jobName}: missing corepack enable step`);
      if (!hasPnpmFallback)
        errors.push(
          `${wfFile} > ${jobName}: missing pnpm/action-setup fallback`,
        );

      if (
        Array.isArray(matrixOs) &&
        matrixOs.length > 1 &&
        matrixOs.some((v: any) =>
          typeof v === "string" ? v.toLowerCase().includes("windows") : false,
        ) &&
        /(test|build)/.test(lowerName) &&
        !/aggregate/.test(lowerName)
      ) {
        if (job.strategy?.["fail-fast"] !== false) {
          errors.push(
            `${wfFile} > ${jobName}: strategy.fail-fast must be false for Windows matrix jobs`,
          );
        }
      }
    }
  }
}

if (warnings.length) {
  console.warn(warnings.join("\n"));
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
