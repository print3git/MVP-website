import fs from "fs";
import path from "path";
import yaml from "yaml";

interface Violation {
  file: string;
  job: string;
  step: string;
  message: string;
}

const ALLOWED_SHELLS = new Set(["bash", "sh", "pwsh", "powershell", "cmd"]);

const INSTALL_RE =
  /(apt(?:-get)?|apk|dnf|yum|brew|choco)\s+install\s+[^\n]*ripgrep/;
const ALIAS_RE = /(rg\s*\(\)\s*\{|alias\s+rg=)/;
const WRAPPER_L_RE = /l_only\s*\(\)\s*\{/;
const WRAPPER_N_RE = /n_only\s*\(\)\s*\{/;
const RG_FLAG_GLOB_RE = /(\s|^)--?g(?:lob)?\b/;

export function audit(
  dir = path.join(process.cwd(), ".github/workflows"),
): Violation[] {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const violations: Violation[] = [];

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const docs = yaml.parseAllDocuments(fs.readFileSync(fullPath, "utf8"));
    for (const doc of docs) {
      if (doc.errors.length) continue;
      const data = doc.toJS() as any;
      if (!data || !data.jobs) continue;
      for (const [jobName, job] of Object.entries<any>(data.jobs)) {
        const steps = job.steps || [];
        let installed = false;
        let hasAlias = false;
        const wrappers = new Set<string>();
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i] as any;
          const name = step.name || `step_${i}`;
          const shell = step.shell as string | undefined;
          const run = step.run as string | undefined;

          if (shell && !ALLOWED_SHELLS.has(shell)) {
            violations.push({
              file,
              job: jobName,
              step: name,
              message: `invalid shell ${shell}`,
            });
          }

          if (!run) continue;
          const lines = run.split("\n");
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            if (INSTALL_RE.test(line)) installed = true;
            if (ALIAS_RE.test(line)) hasAlias = true;
            if (WRAPPER_L_RE.test(line)) wrappers.add("l_only");
            if (WRAPPER_N_RE.test(line)) wrappers.add("n_only");

            const GREP_GLOB_RE = /grep\b[^\n]*\s--?g(?:lob)?\b/;
            if (GREP_GLOB_RE.test(line)) {
              violations.push({
                file,
                job: jobName,
                step: name,
                message: "ripgrep-only flag used with grep",
              });
            }

            if (/l_only\b/.test(line) && !wrappers.has("l_only")) {
              violations.push({
                file,
                job: jobName,
                step: name,
                message: "l_only used without definition",
              });
            }
            if (/n_only\b/.test(line) && !wrappers.has("n_only")) {
              violations.push({
                file,
                job: jobName,
                step: name,
                message: "n_only used without definition",
              });
            }

            if (
              /\brg\b/.test(line) &&
              !/rg\s*\(\)/.test(line) &&
              !/^alias\s+rg=/.test(line) &&
              !/(command -v|which) rg/.test(line)
            ) {
              if (!installed && !hasAlias) {
                violations.push({
                  file,
                  job: jobName,
                  step: name,
                  message: "rg used without install or alias",
                });
              }
              if (hasAlias && RG_FLAG_GLOB_RE.test(line)) {
                violations.push({
                  file,
                  job: jobName,
                  step: name,
                  message: "ripgrep-only flags used with grep fallback",
                });
              }
            }
          }
        }
      }
    }
  }

  return violations;
}

if (require.main === module) {
  const violations = audit();
  const out = { violations };
  const json = JSON.stringify(out, null, 2);
  if (violations.length) {
    console.error(json);
    process.exit(1);
  } else {
    console.log(json);
  }
}
