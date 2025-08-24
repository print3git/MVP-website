const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function diff(a, b) {
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);
  const len = Math.max(aLines.length, bLines.length);
  const out = [];
  for (let i = 0; i < len; i++) {
    if (aLines[i] !== bLines[i]) {
      if (aLines[i] !== undefined) out.push(`- ${aLines[i]}`);
      if (bLines[i] !== undefined) out.push(`+ ${bLines[i]}`);
    }
  }
  return out.join("\n");
}

function format(raw, ext) {
  if (ext === ".js") {
    return raw.endsWith(";\n") ? raw : raw.replace(/\n?$/, ";\n");
  }
  if (ext === ".json") {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2) + "\n";
    } catch {
      return raw;
    }
  }
  if (ext === ".md") {
    return raw.replace(/-\s{2,}/g, "- ");
  }
  return raw;
}

async function validate(root) {
  const errors = [];
  const files = walk(root);
  for (const file of files) {
    const rel = path.relative(root, file);
    const ext = path.extname(file).toLowerCase();
    if (rel.startsWith("img/")) {
      if ([".png", ".jpg", ".jpeg"].includes(ext)) {
        const txt = fs.readFileSync(file).toString("utf8");
        if (!txt.startsWith("version https://git-lfs.github.com/spec/v1")) {
          errors.push(`❌ non-pointer asset: ${rel}`);
        }
      }
      continue;
    }
    if ([".js", ".json", ".md"].includes(ext)) {
      const raw = fs.readFileSync(file, "utf8");
      const formatted = format(raw, ext);
      if (formatted !== raw) {
        errors.push(`❌ prettier: ${rel}\n${diff(raw, formatted)}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

module.exports = { validate };

if (require.main === module) {
  (async () => {
    const res = await validate(process.cwd());
    if (!res.ok) {
      console.error(res.errors.join("\n"));
      process.exitCode = 1;
    }
  })();
}
