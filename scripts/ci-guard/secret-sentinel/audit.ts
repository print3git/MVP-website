import { spawnSync, SpawnSyncReturns } from "node:child_process";

interface AuditOptions {
  useInputVars?: boolean;
  summaryFile?: string;
}

export interface AuditResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Runs the secret sentinel step in a child process.
 * @param varsRaw Raw env var names string.
 * @param env Environment map for the child process.
 * @param options Control env var names and summary file.
 */
export function audit(
  varsRaw: string,
  env: NodeJS.ProcessEnv = {},
  options: AuditOptions = {},
): AuditResult {
  const step =
    `const fs=require('node:fs');\n` +
    `const varsRaw=process.env.VARS_RAW ?? process.env.INPUT_VARS ?? '';\n` +
    `const names=varsRaw.split(/[\\s,]+/).map(v=>v.trim()).filter(Boolean);\n` +
    `const missing=[...new Set(names)].filter(n=>!process.env[n]);\n` +
    `if(missing.length){\n` +
    `  console.log(missing.join('\\n'));\n` +
    `  if(process.env.GITHUB_STEP_SUMMARY){\n` +
    `    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, missing.join('\\n'));\n` +
    `  }\n` +
    `  process.exit(1);\n` +
    `}`;

  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  if (options.useInputVars) {
    childEnv.INPUT_VARS = varsRaw;
  } else {
    childEnv.VARS_RAW = varsRaw;
  }
  if (options.summaryFile) {
    childEnv.GITHUB_STEP_SUMMARY = options.summaryFile;
  }

  const result: SpawnSyncReturns<string> = spawnSync(
    process.execPath,
    ["-e", step],
    { env: childEnv, encoding: "utf8" },
  );

  return {
    code: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}
