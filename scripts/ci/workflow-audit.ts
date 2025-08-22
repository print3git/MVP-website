import fs from "node:fs";
import path from "node:path";
import {
  LineCounter,
  parseDocument,
  isMap,
  isSeq,
  YAMLMap,
  YAMLSeq,
  Scalar,
} from "yaml";

interface LintError {
  file: string;
  line: number;
  message: string;
}

const builtinLabels = new Set([
  "ubuntu-latest",
  "ubuntu-22.04",
  "ubuntu-20.04",
  "ubuntu-24.04",
  "windows-latest",
  "windows-2022",
  "macos-latest",
  "macos-13",
  "macos-14",
  "self-hosted",
  "linux",
  "macos",
  "windows",
]);

const allowedContexts = new Set(["github", "inputs", "secrets", "vars"]);
const allowedReusableKeys = new Set([
  "name",
  "needs",
  "if",
  "uses",
  "with",
  "secrets",
  "permissions",
  "timeout-minutes",
  "continue-on-error",
  "concurrency",
  "strategy",
  "env",
  "outputs",
  "environment",
]);

function loadAllowedLabels(): Set<string> {
  try {
    const cfg = fs.readFileSync(
      path.join(".github", "actionlint.yaml"),
      "utf8",
    );
    const doc = parseDocument(cfg);
    const labels = doc.get("runner-labels");
    if (Array.isArray(labels)) {
      return new Set(labels.map((l: any) => String(l)));
    }
    const runner = (doc.get("runner") as any)?.labels;
    if (Array.isArray(runner)) {
      return new Set(runner.map((l: any) => String(l)));
    }
  } catch {
    // ignore
  }
  return new Set();
}

function lineOf(node: any, lc: LineCounter): number {
  const range = node?.range as [number, number] | undefined;
  if (!range) return 1;
  return lc.linePos(range[0]).line;
}

function collectEnvErrors(
  map: YAMLMap | undefined,
  file: string,
  lc: LineCounter,
  errors: LintError[],
) {
  if (!map || !isMap(map)) return;
  for (const { value } of map.items) {
    if (
      value &&
      value.type === "PLAIN" &&
      typeof value.value === "string" &&
      value.value.includes("${{")
    ) {
      const contexts = Array.from(
        value.value.matchAll(/\$\{\{\s*([^\s.]+)[^}]*\}\}/g),
      ).map((m) => m[1]);
      for (const ctx of contexts) {
        if (!allowedContexts.has(ctx)) {
          errors.push({
            file,
            line: lineOf(value, lc),
            message: `disallowed context "${ctx}" in env expression`,
          });
        }
      }
    }
  }
}

function checkConcurrency(
  node: any,
  file: string,
  lc: LineCounter,
  errors: LintError[],
) {
  if (!node) return;
  if (!isMap(node)) {
    errors.push({
      file,
      line: lineOf(node, lc),
      message: "concurrency must be a mapping",
    });
    return;
  }
  for (const { key } of node.items) {
    const k = String(key.value);
    if (k !== "group" && k !== "cancel-in-progress") {
      errors.push({
        file,
        line: lineOf(key, lc),
        message: `invalid concurrency key "${k}"`,
      });
    }
  }
}

export function lintWorkflow(file: string): LintError[] {
  const errors: LintError[] = [];
  const content = fs.readFileSync(file, "utf8");
  const strayIdx = content
    .split(/\n/)
    .findIndex((l) => l.startsWith("```") || /^python\s+<</.test(l));
  if (strayIdx !== -1) {
    errors.push({ file, line: strayIdx + 1, message: "stray non-YAML block" });
    return errors;
  }
  const lc = new LineCounter();
  const doc = parseDocument(content, { lineCounter: lc });
  if (doc.errors.length) {
    const e = doc.errors[0];
    const pos = e.linePos && e.linePos[0] ? e.linePos[0].line : 1;
    errors.push({ file, line: pos, message: e.message });
    return errors;
  }
  const rootJobs = doc.get("jobs", true);
  const allowedLabels = new Set([...builtinLabels, ...loadAllowedLabels()]);

  collectEnvErrors(
    doc.get("env", true) as YAMLMap | undefined,
    file,
    lc,
    errors,
  );
  checkConcurrency(doc.get("concurrency", true), file, lc, errors);

  if (rootJobs && isMap(rootJobs)) {
    for (const job of rootJobs.items) {
      const jobMap = job.value as YAMLMap;
      const jobName = String(job.key.value);
      const runsOn = jobMap.get("runs-on", true);
      if (runsOn) {
        if (isSeq(runsOn)) {
          if (runsOn.items.some((i) => isSeq(i))) {
            errors.push({
              file,
              line: lineOf(runsOn, lc),
              message: `${jobName}: runs-on must not be nested`,
            });
          }
        } else if (
          runsOn.type !== "PLAIN" &&
          runsOn.type !== "QUOTE_DOUBLE" &&
          runsOn.type !== "QUOTE_SINGLE"
        ) {
          errors.push({
            file,
            line: lineOf(runsOn, lc),
            message: `${jobName}: runs-on must be string or array`,
          });
        }
        const labels: string[] = [];
        if (isSeq(runsOn)) {
          for (const item of (runsOn as YAMLSeq).items) {
            if (item && item.type === "PLAIN")
              labels.push(String((item as Scalar).value));
          }
        } else if (
          runsOn.type === "PLAIN" &&
          typeof runsOn.value === "string" &&
          !runsOn.value.includes("${{")
        ) {
          labels.push(String(runsOn.value));
        }
        for (const lbl of labels) {
          if (!allowedLabels.has(lbl)) {
            errors.push({
              file,
              line: lineOf(runsOn, lc),
              message: `${jobName}: unknown runner label "${lbl}"`,
            });
          }
        }
      }
      collectEnvErrors(
        jobMap.get("env", true) as YAMLMap | undefined,
        file,
        lc,
        errors,
      );
      const uses = jobMap.get("uses", true);
      if (uses) {
        for (const { key } of jobMap.items) {
          const k = String(key.value);
          if (!allowedReusableKeys.has(k)) {
            errors.push({
              file,
              line: lineOf(key, lc),
              message: `${jobName}: disallowed key "${k}" in reusable call`,
            });
          }
        }
      }
      const steps = jobMap.get("steps", true);
      if (steps && isSeq(steps)) {
        for (const step of steps.items) {
          if (isMap(step)) {
            const run = step.get("run", true);
            if (run && run.range) {
              const src = content.slice(run.range[0], run.range[1]);
              if (/'[^'\n]*\$\{\{[^'\n]*\}\}[^'\n]*'/m.test(src)) {
                errors.push({
                  file,
                  line: lineOf(run, lc),
                  message: "expression in single quotes",
                });
              }
            }
          }
        }
      }
      checkConcurrency(jobMap.get("concurrency", true), file, lc, errors);
    }
  }

  const nolint = /#\s*nolint:\s*permissions/.test(content);
  if (!nolint) {
    const perms = doc.get("permissions", true);
    if (!perms) {
      errors.push({ file, line: 1, message: "permissions missing" });
    } else if (isMap(perms)) {
      const contents = perms.get("contents", true);
      if (!contents) {
        errors.push({
          file,
          line: lineOf(perms, lc),
          message: "permissions: contents missing",
        });
      }
    }
  }

  return errors;
}

if (require.main === module) {
  const dir = path.join(".github", "workflows");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml"))
    .map((f) => path.join(dir, f));
  const allErrors: LintError[] = [];
  for (const f of files) {
    allErrors.push(...lintWorkflow(f));
  }
  if (allErrors.length) {
    for (const e of allErrors) {
      console.error(`${e.file}:${e.line} ${e.message}`);
    }
    process.exit(1);
  }
}
