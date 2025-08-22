import fs from "fs";
import path from "path";
import { parseDocument, LineCounter, YAMLMap } from "yaml";
import { execa } from "execa";

const DISALLOWED_KEYS_FOR_USES = [
  "timeout-minutes",
  "runs-on",
  "strategy",
  "container",
  "services",
];

function getPair(map: YAMLMap, key: string) {
  return map.items.find((i: any) => i.key && i.key.value === key);
}

function lineOf(lc: LineCounter, node: any) {
  if (!node || !node.range) return 0;
  return lc.linePos(node.range[0]).line;
}

async function readAllowedLabels(
  file = path.join(".github", "actionlint.yaml"),
) {
  try {
    const src = await fs.promises.readFile(file, "utf8");
    const doc = parseDocument(src);
    const labels = doc.get("labels");
    if (Array.isArray(labels?.toJSON())) {
      return new Set<string>(labels.toJSON());
    }
  } catch {
    // ignore
  }
  return new Set<string>();
}

export async function auditFiles(
  files: string[],
  options: { allowedLabelsFile?: string } = {},
) {
  const allowedLabels = await readAllowedLabels(options.allowedLabelsFile);
  const errors: string[] = [];

  for (const file of files) {
    const content = await fs.promises.readFile(file, "utf8");
    const lc = new LineCounter();
    const doc = parseDocument(content, { lineCounter: lc });
    if (doc.errors.length) {
      for (const err of doc.errors) {
        errors.push(`${file}:${err.linePos?.line ?? 0}: ${err.message}`);
      }
      continue;
    }
    const jobsNode = doc.get("jobs", true) as YAMLMap | null;
    const root = doc.toJS() as any;
    const jobs = root?.jobs || {};
    if (!jobsNode) continue;
    for (const item of jobsNode.items) {
      const jobName = String(item.key.value);
      const jobNode = item.value as YAMLMap;
      const job = jobs[jobName] || {};

      // Rule 1: runs-on no nested array
      const runsOnPair = getPair(jobNode, "runs-on");
      if (runsOnPair) {
        const roNode = runsOnPair.value;
        const roVal = job["runs-on"];
        if (Array.isArray(roVal) && roVal.some((v: any) => Array.isArray(v))) {
          const ln = lineOf(lc, roNode);
          errors.push(
            `${file}:${ln}: job '${jobName}' has nested runs-on sequence`,
          );
        }
        // Rule 5: labels in allowed list
        const labels = Array.isArray(roVal) ? roVal.flat() : [roVal];
        for (const label of labels) {
          if (
            typeof label === "string" &&
            allowedLabels.size &&
            !allowedLabels.has(label)
          ) {
            const ln = lineOf(lc, roNode);
            errors.push(
              `${file}:${ln}: job '${jobName}' uses unknown label '${label}'`,
            );
          }
        }
      }

      // Rule 2: jobs with uses must not have disallowed keys
      if (getPair(jobNode, "uses")) {
        for (const key of DISALLOWED_KEYS_FOR_USES) {
          const pair = getPair(jobNode, key);
          if (pair) {
            const ln = lineOf(lc, pair.value || pair.key);
            errors.push(
              `${file}:${ln}: job '${jobName}' with uses must not include '${key}'`,
            );
          }
        }
      }

      // Rule 3: timeout-minutes expression
      const tmPair = getPair(jobNode, "timeout-minutes");
      if (tmPair) {
        const tmNode = tmPair.value as any;
        const tmVal = job["timeout-minutes"];
        const ln = lineOf(lc, tmNode);
        if (typeof tmVal === "number") {
          // ok
        } else if (typeof tmVal === "string") {
          const m = tmVal.match(/^\$\{\{\s*(.+)\s*\}\}$/);
          if (m) {
            const inner = m[1].trim();
            if (!/^\d+(?:\.\d+)?$/.test(inner) && !/^fromJSON\(/.test(inner)) {
              errors.push(
                `${file}:${ln}: job '${jobName}' has invalid timeout-minutes expression`,
              );
            }
          } else {
            errors.push(
              `${file}:${ln}: job '${jobName}' timeout-minutes must be numeric`,
            );
          }
        } else {
          errors.push(
            `${file}:${ln}: job '${jobName}' timeout-minutes must be numeric`,
          );
        }
      }
    }
  }

  if (errors.length) {
    throw new Error(errors.join("\n"));
  }
}

async function changedWorkflows(): Promise<string[]> {
  try {
    const base = (
      await execa("git", ["merge-base", "HEAD", "origin/main"])
    ).stdout.trim();
    const diff = (
      await execa("git", [
        "diff",
        "--name-only",
        "--diff-filter=ACMRTUXB",
        base,
        "HEAD",
        "--",
        ".github/workflows",
      ])
    ).stdout;
    return diff
      .split("\n")
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : await changedWorkflows();
  if (files.length === 0) return;
  await auditFiles(files);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
