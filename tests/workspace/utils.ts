import fs from "fs";
import path from "path";
import YAML from "yaml";

interface WorkflowFile {
  path: string;
  data: any;
  lines: string[];
}

const workflowDir = path.resolve(__dirname, "../../.github/workflows");

export function loadWorkflows(): WorkflowFile[] {
  const files = fs
    .readdirSync(workflowDir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  return files.map((file) => {
    const full = path.join(workflowDir, file);
    const content = fs.readFileSync(full, "utf8");
    let data: any;
    try {
      data = YAML.parse(content);
    } catch {
      return { path: full, data: null, lines: content.split(/\r?\n/) };
    }
    return { path: full, data, lines: content.split(/\r?\n/) };
  });
}

export function findPnpmStepsMissingWorkingDir() {
  const missing: { file: string; line: number; step: string }[] = [];
  for (const wf of loadWorkflows()) {
    if (!wf.data) continue;
    const wfDefault = wf.data?.defaults?.run?.["working-directory"];
    for (const [jobName, job] of Object.entries<any>(wf.data.jobs || {})) {
      const jobDefault = job?.defaults?.run?.["working-directory"] ?? wfDefault;
      for (const step of job.steps || []) {
        if (typeof step.run === "string" && step.run.includes("pnpm")) {
          const stepDir =
            step["working-directory"] || jobDefault || wfDefault || ".";
          if (!stepDir) {
            const snippet = step.run.split("\n")[0];
            const line =
              wf.lines.findIndex((l) => l.includes(snippet)) + 1 || 0;
            missing.push({
              file: `${wf.path}#L${line}`,
              line,
              step: snippet,
            });
          }
        }
      }
    }
  }
  return missing;
}

export function findSetupNodeWithoutVersion() {
  const offenders: { file: string; line: number }[] = [];
  for (const wf of loadWorkflows()) {
    if (!wf.data) continue;
    for (const [jobName, job] of Object.entries<any>(wf.data.jobs || {})) {
      for (const step of job.steps || []) {
        if (
          typeof step.uses === "string" &&
          step.uses.startsWith("actions/setup-node@v4")
        ) {
          const withBlock = step.with || {};
          if (!("node-version" in withBlock) && !("node-version-file" in withBlock)) {
            const idx = wf.lines.findIndex((l) =>
              l.includes("actions/setup-node@v4"),
            );
            offenders.push({ file: `${wf.path}#L${idx + 1}`, line: idx + 1 });
          }
        }
      }
    }
  }
  return offenders;
}

