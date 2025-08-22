import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export async function audit(workflowDir: string): Promise<string[]> {
  const entries = await fs.readdir(workflowDir);
  const offenders: string[] = [];
  for (const file of entries) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const full = path.join(workflowDir, file);
    const content = await fs.readFile(full, "utf8");
    let workflow: any;
    try {
      workflow = parse(content);
    } catch (err) {
      console.warn(`Skipping ${file}: ${(err as Error).message}`);
      continue;
    }
    const jobs = workflow?.jobs ?? {};
    let usesGithubScript = false;
    for (const job of Object.values(jobs)) {
      const steps = (job as any)?.steps ?? [];
      if (
        steps.some(
          (s: any) =>
            typeof s.uses === "string" &&
            s.uses.startsWith("actions/github-script"),
        )
      ) {
        usesGithubScript = true;
        break;
      }
    }
    if (usesGithubScript) {
      const perm = workflow?.permissions ?? {};
      const hasIssues = perm.issues === "write";
      const hasPR = perm["pull-requests"] === "write";
      if (!hasIssues && !hasPR) {
        offenders.push(file);
      }
    }
  }
  return offenders;
}

async function main() {
  const dir = path.join(process.cwd(), ".github", "workflows");
  const offenders = await audit(dir);
  if (offenders.length) {
    console.error(
      "Workflows using actions/github-script must declare permissions.issues: write or permissions.pull-requests: write:\n" +
        offenders.join("\n"),
    );
    process.exit(1);
  }
  console.log("All workflows have correct permissions");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
