import fs from "fs";
import path from "path";
import YAML from "yaml";

export interface AuditResult {
  ok: boolean;
  errors: string[];
  lanes: string[];
  workflowPath?: string;
}

function findWorkflow(workDir: string): { path: string; data: any } | null {
  const wfDir = path.join(workDir, ".github", "workflows");
  const files = fs.existsSync(wfDir) ? fs.readdirSync(wfDir) : [];
  for (const file of files) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const full = path.join(wfDir, file);
    const content = fs.readFileSync(full, "utf8");
    try {
      const data = YAML.parse(content);
      if (data && data.name === "CI Fast Lane") {
        return { path: full, data };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function audit(workDir: string = process.cwd()): AuditResult {
  const found = findWorkflow(workDir);
  const errors: string[] = [];
  if (!found) {
    errors.push("CI Fast Lane workflow not found");
    return { ok: false, errors, lanes: [] };
  }
  const { path: wfPath, data } = found;
  const jobs = data.jobs || {};
  const changes = jobs["changes"];
  if (!changes) {
    errors.push("changes job missing");
    return { ok: false, errors, lanes: [], workflowPath: wfPath };
  }
  const steps = Array.isArray(changes.steps) ? changes.steps : [];
  const checkout = steps.find(
    (s: any) =>
      typeof s.uses === "string" && s.uses.startsWith("actions/checkout@"),
  );
  if (!checkout) {
    errors.push("actions/checkout@v4 step missing in changes job");
  } else {
    if (!/actions\/checkout@v4/.test(checkout.uses)) {
      errors.push("changes job must use actions/checkout@v4");
    }
    const fd =
      checkout.with &&
      (checkout.with["fetch-depth"] ?? checkout.with["fetch_depth"]);
    if (fd !== 0 && fd !== "0") {
      errors.push("changes job must set fetch-depth: 0");
    }
  }
  const outputs = changes.outputs || {};
  const lanes = Object.keys(outputs).filter((k) => k !== "_any");
  if (!("_any" in outputs)) {
    errors.push("changes job must expose '_any' output");
  }

  for (const [jobName, jobVal] of Object.entries(jobs)) {
    if (jobName === "changes") continue;
    const job: any = jobVal;
    const jobIf: string | undefined = job["if"];
    if (!jobIf) continue;
    const match = jobIf.match(/needs\.changes\.outputs\.([A-Za-z0-9_-]+)/);
    if (!match) continue;
    const lane = match[1];
    if (!lanes.includes(lane)) {
      errors.push(
        `lane '${lane}' referenced but not defined in changes outputs`,
      );
      continue;
    }
    const needs = job.needs;
    const needsArr = Array.isArray(needs)
      ? needs
      : typeof needs === "string"
        ? [needs]
        : [];
    if (!needsArr.includes("changes")) {
      errors.push(`job '${jobName}' missing needs: changes`);
    }
    const failOpen = new RegExp(
      `needs\\.changes\\.outputs\\.${lane} == 'true' \\|\\| needs\\.changes\\.outputs\\._any == 'true'`,
    );
    if (!failOpen.test(jobIf)) {
      errors.push(
        `job '${jobName}' must use fail-open condition for lane '${lane}'`,
      );
    }
  }

  const ok = errors.length === 0;
  return { ok, errors, lanes, workflowPath: wfPath };
}

if (require.main === module) {
  const result = audit();
  const report = {
    ok: result.ok,
    errors: result.errors,
    lanes: result.lanes,
    workflow: result.workflowPath,
  };
  const outDir = path.join(process.cwd(), "ci-reports");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "ci-gate.json"),
    JSON.stringify(report, null, 2),
  );
  if (result.ok) {
    console.log("CI Gate audit passed:", result.lanes.join(", "));
  } else {
    console.log("CI Gate audit failed:", result.errors.join("; "));
    process.exitCode = 1;
  }
}
