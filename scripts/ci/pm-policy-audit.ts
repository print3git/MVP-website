import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export function audit(root = process.cwd()): string[] {
  const errors: string[] = [];
  const lockCandidates = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"];
  const present = lockCandidates.filter((f) =>
    fs.existsSync(path.join(root, f)),
  );
  if (present.length !== 1) {
    errors.push(
      `expected exactly one lockfile, found ${present.length}: ${present.join(", ")}`,
    );
  }
  const manager = present[0]?.endsWith("pnpm-lock.yaml")
    ? "pnpm"
    : present[0]?.endsWith("package-lock.json")
      ? "npm"
      : present[0]?.endsWith("yarn.lock")
        ? "yarn"
        : undefined;

  const wfDir = path.join(root, ".github", "workflows");
  if (fs.existsSync(wfDir)) {
    const workflowFiles = listYaml(wfDir);
    for (const file of workflowFiles) {
      const content = fs.readFileSync(file, "utf8");
      let doc: any;
      try {
        doc = parse(content);
      } catch (err) {
        errors.push(
          `failed to parse ${relative(root, file)}: ${(err as Error).message}`,
        );
        continue;
      }
      if (!doc?.jobs) continue;
      for (const [jobName, job] of Object.entries<any>(doc.jobs)) {
        const steps: any[] = Array.isArray(job.steps) ? job.steps : [];
        let nodeSeen = false;
        let corepackSeen = false;
        for (const step of steps) {
          const run: string | undefined = step.run;
          const uses: string | undefined = step.uses;
          if (manager === "pnpm" && run) {
            if (/\bnpm ci\b/.test(run)) {
              errors.push(`${relative(root, file)}:${jobName} uses npm ci`);
            }
            if (/\byarn(\s|$)/.test(run)) {
              errors.push(`${relative(root, file)}:${jobName} uses yarn`);
            }
          }
          if (uses && /^pnpm\/action-setup@/.test(uses)) {
            if (step.with && step.with.version) {
              errors.push(
                `${relative(root, file)}:${jobName} pin pnpm/action-setup version`,
              );
            }
          }
          if (uses && /^actions\/setup-node@/.test(uses)) {
            nodeSeen = true;
            const cache = step.with?.cache;
            if (cache !== "pnpm") {
              errors.push(
                `${relative(root, file)}:${jobName} setup-node cache is '${cache || "undefined"}'`,
              );
            }
          }
          if (run && /corepack enable/.test(run)) {
            if (nodeSeen) corepackSeen = true;
          }
        }
        if (nodeSeen && !corepackSeen) {
          errors.push(
            `${relative(root, file)}:${jobName} missing corepack enable`,
          );
        }
      }
    }
  }
  return errors;
}

function listYaml(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listYaml(p));
    else if (e.isFile() && (p.endsWith(".yml") || p.endsWith(".yaml")))
      out.push(p);
  }
  return out;
}

function relative(root: string, file: string): string {
  return path.relative(root, file) || file;
}

if (require.main === module) {
  const errs = audit();
  if (errs.length) {
    console.error(errs.join("\n"));
    process.exit(1);
  }
}
