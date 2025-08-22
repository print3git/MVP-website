import fs from "fs";
import path from "path";
import YAML from "yaml";

interface AuditOptions {
  repoRoot?: string;
  allowlistPath?: string;
}

export interface AuditResult {
  errors: string[];
  warnings: string[];
  summary: string;
}

function normalize(p: string): string {
  return p.replace(/\\/g, "/");
}

export function audit(options: AuditOptions = {}): AuditResult {
  const repoRoot = options.repoRoot || process.cwd();
  const allowlistFile =
    options.allowlistPath ||
    path.join(repoRoot, "ci-guard", "single-lockfile-policy", "allowlist.json");

  let allowlist: string[] = [];
  if (fs.existsSync(allowlistFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(allowlistFile, "utf8"));
      allowlist = (data.packageLocks || []).map((p: string) => normalize(p));
    } catch {
      /* ignore malformed allowlist */
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const pkgPath = path.join(repoRoot, "package.json");
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, "utf8"))
    : {};
  const packageManager: string | undefined = pkg.packageManager;
  const pnpmVersion = packageManager?.startsWith("pnpm@")
    ? packageManager.split("@")[1]
    : undefined;

  // root lockfile check
  const lockfiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"].filter(
    (f) => fs.existsSync(path.join(repoRoot, f)),
  );
  if (lockfiles.length > 1) {
    errors.push(
      `Multiple lockfiles at repo root: ${lockfiles.join(", ")}. Keep only pnpm-lock.yaml.`,
    );
  } else if (
    packageManager?.startsWith("pnpm") &&
    lockfiles.length === 1 &&
    lockfiles[0] !== "pnpm-lock.yaml"
  ) {
    errors.push(
      `packageManager declares pnpm but found ${lockfiles[0]}. Use pnpm-lock.yaml.`,
    );
  } else if (packageManager?.startsWith("pnpm") && lockfiles.length === 0) {
    errors.push(
      "packageManager declares pnpm but no pnpm-lock.yaml found at repo root.",
    );
  }

  // .npmrc check
  if (packageManager?.startsWith("pnpm")) {
    const npmrcPath = path.join(repoRoot, ".npmrc");
    if (!fs.existsSync(npmrcPath)) {
      warnings.push(
        "Missing .npmrc with package-lock=false to prevent npm lockfile generation.",
      );
    } else {
      const npmrc = fs.readFileSync(npmrcPath, "utf8");
      if (!/^package-lock\s*=\s*false/m.test(npmrc)) {
        warnings.push(
          ".npmrc should set package-lock=false to prevent npm lockfile generation.",
        );
      }
    }
  }

  // workflow checks
  const wfDir = path.join(repoRoot, ".github", "workflows");
  if (fs.existsSync(wfDir)) {
    const wfFiles = fs
      .readdirSync(wfDir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    for (const wf of wfFiles) {
      const doc = YAML.parse(fs.readFileSync(path.join(wfDir, wf), "utf8"));
      const jobs = doc?.jobs || {};
      for (const [jobName, job] of Object.entries<any>(jobs)) {
        const steps: any[] = job.steps || [];
        let setupNodeCache: string | undefined;
        let pnpmSetupVersion: string | undefined;
        let runsPnpm = false;
        let runsNpmOrYarn = false;
        for (const step of steps) {
          if (typeof step.run === "string") {
            if (/\bpnpm\b/.test(step.run)) runsPnpm = true;
            if (/\b(npm|yarn)\b/.test(step.run) && !/\bpnpm\b/.test(step.run))
              runsNpmOrYarn = true;
          }
          if (typeof step.uses === "string") {
            if (/^actions\/setup-node@/.test(step.uses)) {
              setupNodeCache = step.with?.cache;
            }
            if (/^pnpm\/action-setup@/.test(step.uses)) {
              pnpmSetupVersion = step.with?.version;
            }
          }
        }
        if (packageManager?.startsWith("pnpm")) {
          if (runsNpmOrYarn) {
            errors.push(
              `Workflow ${wf} job ${jobName} runs npm/yarn while project uses pnpm.`,
            );
          }
          if (runsPnpm && setupNodeCache && setupNodeCache !== "pnpm") {
            errors.push(
              `Workflow ${wf} job ${jobName} uses setup-node cache '${setupNodeCache}'. Use 'pnpm'.`,
            );
          }
          if (
            runsPnpm &&
            pnpmVersion &&
            pnpmSetupVersion &&
            pnpmSetupVersion !== pnpmVersion
          ) {
            errors.push(
              `Workflow ${wf} job ${jobName} uses pnpm/action-setup version ${pnpmSetupVersion} but packageManager specifies pnpm@${pnpmVersion}.`,
            );
          }
        }
      }
    }
  }

  // nested package-lock detection
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        walk(abs);
      } else if (entry.isFile() && entry.name === "package-lock.json") {
        const rel = normalize(path.relative(repoRoot, abs));
        if (rel === "package-lock.json") continue; // root handled above
        if (!allowlist.includes(rel)) {
          errors.push(`Found non-allowlisted package-lock.json at ${rel}`);
        }
      }
    }
  }
  walk(repoRoot);

  const summary = [
    ...errors.map((e) => `ERROR: ${e}`),
    ...warnings.map((w) => `WARN: ${w}`),
  ].join("\n");

  return { errors, warnings, summary };
}

if (require.main === module) {
  const result = audit();
  if (result.summary) console.log(result.summary);
  if (result.errors.length) process.exit(1);
}
