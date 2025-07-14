const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["backend", "scripts"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      walk(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

function hasJsDoc(lines, index) {
  for (let i = index - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === "") continue;
    if (line.startsWith("/**")) return true;
    if (line.startsWith("*") || line.startsWith("*/")) continue;
    return false;
  }
  return false;
}

function insertStubs(file) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\n/);
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/,
    );
    if (match && !hasJsDoc(lines, i)) {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const params = line.includes("(")
        ? line
            .split("(")[1]
            .split(")")[0]
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean)
        : [];
      const stub = [
        `${indent}/**`,
        ...params.map((p) => `${indent} * @param ${p}`),
        `${indent} * @returns`,
        `${indent} */`,
      ];
      lines.splice(i, 0, ...stub);
      i += stub.length;
      changed = true;
    }
    const classMatch = line.match(/export\s+class\s+([a-zA-Z0-9_]+)/);
    if (classMatch && !hasJsDoc(lines, i)) {
      const indent = line.match(/^\s*/)?.[0] ?? "";
      const stub = [
        `${indent}/**`,
        `${indent} * @class ${classMatch[1]}`,
        `${indent} */`,
      ];
      lines.splice(i, 0, ...stub);
      i += stub.length;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, lines.join("\n"));
  }
}

for (const dir of TARGET_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    insertStubs(file);
  }
}
