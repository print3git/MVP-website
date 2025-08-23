const fs = require("fs");
const path = require("path");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (full.endsWith(".yml") || full.endsWith(".yaml")) {
      files.push(full);
    }
  }
  return files;
}

function checkScript(script, file) {
  const lines = script.split(/\r?\n/);
  for (const line of lines) {
    if (
      /require\(['"]@actions\/core['"]\)/.test(line) ||
      /require\(['"]@actions\/github['"]\)/.test(line)
    ) {
      console.error(`${file}: forbidden require detected -> ${line.trim()}`);
      return false;
    }
    if (
      /^\s*const\s+core\s*=/.test(line) ||
      /^\s*const\s+github\s*=/.test(line)
    ) {
      console.error(
        `${file}: forbidden redeclaration detected -> ${line.trim()}`,
      );
      return false;
    }
  }
  return true;
}

function checkFile(file) {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/uses:\s*actions\/github-script@/.test(lines[i])) {
      let j = i + 1;
      while (j < lines.length && !/script:/.test(lines[j])) j++;
      if (j >= lines.length) continue;
      const scriptLine = lines[j];
      const indent = (scriptLine.match(/^(\s*)/) || [""])[1].length;
      const indicator = scriptLine.match(/script:\s*(\|[+\-]?|>[+\-]?)/);
      let script = "";
      if (indicator) {
        j++;
        while (
          j < lines.length &&
          lines[j].startsWith(" ".repeat(indent + 2))
        ) {
          script += lines[j].slice(indent + 2) + "\n";
          j++;
        }
      } else {
        script = scriptLine.split(/script:\s*/)[1];
      }
      if (!checkScript(script, file)) return false;
      i = j - 1;
    }
  }
  return true;
}

function main() {
  const root = path.join(process.cwd(), ".github", "workflows");
  let ok = true;
  if (fs.existsSync(root)) {
    for (const file of walk(root)) {
      if (!checkFile(file)) ok = false;
    }
  }
  if (!ok) process.exit(1);
}

main();
