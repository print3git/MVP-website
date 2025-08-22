import fs from "fs";
import path from "path";
import YAML from "yaml";

function findWorkflow(workDir: string): { path: string; data: any } | null {
  const wfDir = path.join(workDir, ".github", "workflows");
  const files = fs.existsSync(wfDir) ? fs.readdirSync(wfDir) : [];
  for (const file of files) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const full = path.join(wfDir, file);
    const data = YAML.parse(fs.readFileSync(full, "utf8"));
    if (data && data.name === "CI Fast Lane") {
      return { path: full, data };
    }
  }
  return null;
}

function ensureFetchDepth(changes: any) {
  const steps = Array.isArray(changes.steps) ? changes.steps : [];
  let checkout = steps.find(
    (s: any) =>
      typeof s.uses === "string" && s.uses.startsWith("actions/checkout@"),
  );
  if (!checkout) {
    checkout = { uses: "actions/checkout@v4", with: { "fetch-depth": 0 } };
    steps.unshift(checkout);
  } else {
    checkout.uses = "actions/checkout@v4";
    checkout.with = { ...(checkout.with || {}), "fetch-depth": 0 };
  }
  changes.steps = steps;
}

function ensureLane(job: any, lane: string) {
  const cond = `needs.changes.outputs.${lane} == 'true' || needs.changes.outputs._any == 'true'`;
  job.if = cond;
  const needs = job.needs;
  const arr = Array.isArray(needs)
    ? needs
    : typeof needs === "string"
      ? [needs]
      : [];
  if (!arr.includes("changes")) arr.push("changes");
  job.needs = arr.length === 1 ? arr[0] : arr;
}

export function fix(workDir: string = process.cwd()) {
  const found = findWorkflow(workDir);
  if (!found) return;
  const { path: wfPath, data } = found;
  const changes = data.jobs?.changes;
  if (!changes) return;
  ensureFetchDepth(changes);
  const outputs = changes.outputs || {};
  const lanes = Object.keys(outputs).filter((k) => k !== "_any");
  for (const lane of lanes) {
    const job = data.jobs[lane];
    if (job) ensureLane(job, lane);
  }
  fs.writeFileSync(wfPath, YAML.stringify(data));
}

if (require.main === module) {
  fix();
}
