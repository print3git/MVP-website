import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Step {
  name?: string;
  if?: string;
  uses?: string;
  [key: string]: any;
}

interface Job {
  [key: string]: any;
  steps?: Step[];
}

function hasWindows(value: any): boolean {
  if (typeof value === "string") return /windows/i.test(value);
  if (Array.isArray(value)) return value.some(hasWindows);
  return false;
}

const errors: string[] = [];
const repoRoot = process.cwd();
const workflowsDir = path.join(repoRoot, ".github", "workflows");
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
    let isWindows = false;
    if (hasWindows(job["runs-on"])) isWindows = true;
    const matrixOs = job.strategy?.matrix?.os;
    if (hasWindows(matrixOs)) isWindows = true;
    if (!isWindows) continue;

    if (job.strategy && job.strategy["fail-fast"] !== false) {
      errors.push(`${wfFile} > ${jobName}: strategy.fail-fast must be false`);
    }
    const steps: Step[] = job.steps || [];
    function find(name: string, cond: string) {
      return steps.some((s) => s.name === name && s.if === cond);
    }
    if (
      !(
        find("Setup Node (Windows)", "startsWith(runner.os, 'Windows')") &&
        find("Enable Corepack (Windows)", "startsWith(runner.os, 'Windows')") &&
        find("Ensure pnpm (Windows fallback)", "startsWith(runner.os, 'Windows')")
      )
    ) {
      errors.push(`${wfFile} > ${jobName}: missing Windows bootstrap block`);
    }
    if (!find("Cancellation probe", "always()")) {
      errors.push(`${wfFile} > ${jobName}: missing Cancellation probe step`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
