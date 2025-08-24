import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

interface ListEntry {
  path: string;
  mode?: "warn" | "fail";
  root?: string;
}

interface AuditOptions {
  listPath?: string;
  summaryFile?: string;
}

interface AuditResult {
  warnings: string[];
  errors: string[];
  summary: string;
}

export async function runAudit(opts: AuditOptions = {}): Promise<AuditResult> {
  const listPath = opts.listPath || path.join(__dirname, "list.json");
  let entries: ListEntry[] = [];
  try {
    const raw = await fs.readFile(listPath, "utf8");
    entries = JSON.parse(raw);
  } catch (e: any) {
    if (e.code !== "ENOENT") throw e;
    // missing list file -> no entries
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  for (const entry of entries) {
    const mode = entry.mode || "warn";
    const filePath = path.join(entry.root || ".", entry.path);
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      const msg = `missing workflow: ${filePath}`;
      if (mode === "fail") errors.push(msg);
      else warnings.push(msg);
      continue;
    }

    try {
      const data = parse(content);
      if (!data || typeof data !== "object" || !data.on || !data.jobs) {
        throw new Error("missing required keys");
      }
      const triggers = data.on;
      let onlyDispatch = false;
      if (typeof triggers === "string") {
        onlyDispatch = triggers === "workflow_dispatch";
      } else if (Array.isArray(triggers)) {
        onlyDispatch =
          triggers.length === 1 && triggers[0] === "workflow_dispatch";
      } else if (typeof triggers === "object") {
        const keys = Object.keys(triggers);
        onlyDispatch = keys.length === 1 && keys[0] === "workflow_dispatch";
      }
      if (onlyDispatch) {
        warnings.push(
          `${filePath} only defines workflow_dispatch and will not run automatically`,
        );
      }
    } catch (err: any) {
      errors.push(`${filePath}: ${err.message}`);
    }
  }

  const lines: string[] = ["## Required workflows audit"];
  if (warnings.length === 0 && errors.length === 0) {
    lines.push("All checks passed.");
  }
  if (warnings.length) {
    lines.push("### Warnings");
    for (const w of warnings) lines.push(`- ${w}`);
  }
  if (errors.length) {
    lines.push("### Errors");
    for (const e of errors) lines.push(`- ${e}`);
  }

  const summary = lines.join("\n") + "\n";
  const summaryFile = opts.summaryFile || process.env.AUDIT_SUMMARY_PATH;
  if (summaryFile) {
    await fs.writeFile(summaryFile, summary, "utf8");
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary, "utf8");
  }

  return { warnings, errors, summary };
}

if (require.main === module) {
  runAudit()
    .then((res) => {
      if (res.errors.length) {
        console.error(res.summary);
        process.exitCode = 1;
      } else {
        console.log(res.summary);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
