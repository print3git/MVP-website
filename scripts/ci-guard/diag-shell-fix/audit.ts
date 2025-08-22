import fs from "fs";
import path from "path";
import yaml from "yaml";

const allowed = new Set(["bash", "sh", "pwsh", "powershell", "cmd"]);

export interface AuditError {
  file: string;
  job: string;
  step: string;
  message: string;
}

function isDiagnostic(step: any): boolean {
  const content = `${step.name || ""} ${step.run || ""}`;
  return /dmesg|journalctl|git log|cp .*ci\/diag/.test(content);
}

function isWindowsJob(job: any): boolean {
  const runsOn = job["runs-on"];
  if (Array.isArray(runsOn)) {
    return runsOn.some((r) => /windows/i.test(r));
  }
  return /windows/i.test(String(runsOn || ""));
}

export function audit(
  dir = path.join(process.cwd(), ".github", "workflows"),
): AuditError[] {
  const errors: AuditError[] = [];
  if (!fs.existsSync(dir)) return errors;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const file of files) {
    const full = path.join(dir, file);
    const doc = yaml.parse(fs.readFileSync(full, "utf8"));
    const jobs = doc?.jobs || {};
    for (const [jobName, job] of Object.entries<any>(jobs)) {
      const steps = job.steps || [];
      let mkdirSeen = false;
      for (let i = 0; i < steps.length; i++) {
        const step: any = steps[i];
        const stepName = step.name || `step ${i}`;
        const shell = step.shell;
        const run: string = step.run || "";

        // track mkdir
        if (/mkdir -p ci\/diag/.test(run)) {
          mkdirSeen = true;
        }

        // generic shell validation
        if (shell && typeof shell === "string" && !shell.includes("{0}")) {
          const base = shell.split(" ")[0];
          if (allowed.has(base) && shell.trim() !== base) {
            if (!isDiagnostic(step)) {
              errors.push({
                file,
                job: jobName,
                step: stepName,
                message: `move shell flags into run: ${shell}`,
              });
            }
          } else if (!allowed.has(shell)) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: `invalid shell: ${shell}`,
            });
          }
        }

        const diag = isDiagnostic(step);
        if (!diag) continue;
        const windows = isWindowsJob(job);
        if (!windows) {
          if (shell !== "bash") {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "diagnostic step requires shell: bash",
            });
          }

          if (!mkdirSeen) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "missing mkdir -p ci/diag",
            });
          }

          if (
            /dmesg/.test(run) &&
            !(
              /command -v dmesg/.test(run) || /dmesg[^\n]*\|\|\s*true/.test(run)
            )
          ) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "dmesg not guarded",
            });
          }
          if (
            /journalctl/.test(run) &&
            !(
              /command -v journalctl/.test(run) ||
              /journalctl[^\n]*\|\|\s*true/.test(run)
            )
          ) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "journalctl not guarded",
            });
          }
          if (
            /git log/.test(run) &&
            !(
              /command -v git/.test(run) || /git log[^\n]*\|\|\s*true/.test(run)
            )
          ) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "git log not guarded",
            });
          }
          if (/cp .*ci\/diag/.test(run) && !/\[ -[df] .*\]/.test(run)) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "cp to ci/diag not guarded",
            });
          }

          const upload = steps
            .slice(i + 1)
            .find((s: any) => s.uses === "actions/upload-artifact@v4");
          if (!upload) {
            errors.push({
              file,
              job: jobName,
              step: stepName,
              message: "missing upload-artifact@v4",
            });
          } else {
            if (!upload.if || !/always\(\)/.test(upload.if)) {
              errors.push({
                file,
                job: jobName,
                step: stepName,
                message: "upload-artifact missing if: always()",
              });
            }
            const pathInput = upload.with && upload.with.path;
            if (!pathInput || !/ci\/diag/.test(pathInput)) {
              errors.push({
                file,
                job: jobName,
                step: stepName,
                message: "upload-artifact missing ci/diag path",
              });
            }
          }
        }
      }
    }
  }
  return errors;
}

if (require.main === module) {
  const errors = audit();
  fs.writeFileSync(
    "diag-shell-fix-audit-summary.json",
    JSON.stringify(errors, null, 2),
    "utf8",
  );
  if (errors.length) {
    for (const e of errors) {
      console.error(`${e.file} > ${e.job} > ${e.step}: ${e.message}`);
    }
    console.error(`${errors.length} error(s) found`);
    process.exit(1);
  } else {
    console.log("No issues found");
  }
}
