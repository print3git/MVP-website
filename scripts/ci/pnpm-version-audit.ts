import { promises as fs } from "node:fs";
import path from "node:path";
import YAML from "yaml";

export interface AuditResult {
  expectedVersion: string;
  violations: string[];
}

export async function auditWorkflows(
  rootDir = process.cwd(),
): Promise<AuditResult> {
  const pkgPath = path.join(rootDir, "package.json");
  const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8")) as {
    packageManager?: string;
  };
  const pm = pkg.packageManager;
  if (!pm || !pm.startsWith("pnpm@")) {
    throw new Error("package.json packageManager must specify pnpm@<version>");
  }
  const expectedVersion = pm.split("@")[1];
  const workflowsDir = path.join(rootDir, ".github", "workflows");
  const files = await fs.readdir(workflowsDir);
  const violations: string[] = [];
  for (const file of files) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const raw = await fs.readFile(path.join(workflowsDir, file), "utf8");
    const content = preprocess(raw);
    let doc: any;
    try {
      doc = YAML.parse(content);
    } catch {
      violations.push(`${file}: failed to parse`);
      continue;
    }
    const jobs = doc?.jobs;
    if (!jobs || typeof jobs !== "object") continue;
    for (const [jobName, job] of Object.entries<any>(jobs)) {
      const steps: any[] = Array.isArray(job?.steps) ? job.steps : [];
      steps.forEach((step, index) => {
        const uses: string | undefined = step?.uses;
        if (typeof uses === "string" && uses.startsWith("pnpm/action-setup@")) {
          if (step.with?.version) {
            violations.push(
              `${file} (${jobName}): pnpm/action-setup must not specify a version`,
            );
          }
          const prior = steps.slice(0, index);
          const hasSetupNode = prior.some(
            (s) =>
              typeof s.uses === "string" &&
              s.uses.startsWith("actions/setup-node@v4"),
          );
          if (!hasSetupNode) {
            violations.push(
              `${file} (${jobName}): missing actions/setup-node@v4 before pnpm`,
            );
          }
          const hasCorepack = prior.some(
            (s) => typeof s.run === "string" && /corepack enable/.test(s.run),
          );
          if (!hasCorepack) {
            violations.push(
              `${file} (${jobName}): missing corepack enable step before pnpm`,
            );
          }
        }
      });
    }
  }
  return { expectedVersion, violations };
}

function preprocess(source: string): string {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*).*<<['"]?(\w+)['"]?/);
    if (m) {
      const indent = m[1] + "  ";
      const tag = m[2];
      i++;
      for (; i < lines.length && lines[i].trim() !== tag; i++) {
        lines[i] = indent + lines[i];
      }
      if (i < lines.length) {
        lines[i] = indent + lines[i];
      }
    }
  }
  return lines.join("\n");
}

if (require.main === module) {
  auditWorkflows()
    .then(({ expectedVersion, violations }) => {
      if (violations.length) {
        console.error("PNPM version audit failed:");
        for (const v of violations) {
          console.error(`- ${v}`);
        }
        process.exit(1);
      } else {
        console.log(`PNPM version audit passed for pnpm@${expectedVersion}`);
      }
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
