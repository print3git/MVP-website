import fs from "node:fs";
import path from "node:path";
import YAML, { Node } from "yaml";

const ALLOWED_SHELLS = new Set(["bash", "sh", "pwsh", "powershell", "cmd"]);

export interface ShellError {
  file: string;
  line: number;
  shell: string;
}

function auditNode(
  node: Node | null | undefined,
  file: string,
  errors: ShellError[],
  lc: YAML.LineCounter,
): void {
  if (!node) return;
  if (YAML.isMap(node)) {
    for (const item of node.items) {
      const key = item.key?.toString();
      const valueNode = item.value as Node | undefined;
      if (key === "shell" && valueNode) {
        const value = valueNode.toString();
        if (!ALLOWED_SHELLS.has(value) && !value.includes("{0}")) {
          const pos = lc.linePos(valueNode.range ? valueNode.range[0] : 0);
          errors.push({ file, line: pos.line, shell: value });
        }
      }
      auditNode(valueNode, file, errors, lc);
    }
  } else if (YAML.isSeq(node)) {
    for (const n of node.items) auditNode(n as Node, file, errors, lc);
  }
}

export function auditWorkflow(content: string, file: string): ShellError[] {
  const lc = new YAML.LineCounter();
  const doc = YAML.parseDocument(content, { lineCounter: lc });
  const errors: ShellError[] = [];
  auditNode(doc.contents as Node, file, errors, lc);
  return errors;
}

export function auditAllWorkflows(): ShellError[] {
  const dir = path.join(".github", "workflows");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  let all: ShellError[] = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    all = all.concat(auditWorkflow(text, file));
  }
  return all;
}

if (require.main === module) {
  const errors = auditAllWorkflows();
  if (errors.length) {
    for (const e of errors) {
      console.error(`${e.file}:${e.line} invalid shell '${e.shell}'`);
    }
    process.exit(1);
  } else {
    console.log("All workflow shells are valid.");
  }
}
