const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const candidates = ["out", "dist", "build"];
const outputDir =
  candidates
    .map((d) => path.join(repoRoot, d))
    .find((p) => fs.existsSync(p) && fs.statSync(p).isDirectory()) || repoRoot;

function walk(dir) {
  const list = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      list.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      list.push(full);
    }
  }
  return list;
}

function isLocal(ref) {
  return !/^(?:https?:)?\/\//.test(ref) && !ref.startsWith("data:");
}

function cleanRef(ref) {
  return ref.replace(/^\//, "");
}

for (const file of walk(outputDir)) {
  let html = fs.readFileSync(file, "utf8");
  let modified = html;
  const patterns = [
    /<script[^>]*?src="([^"]+)"[^>]*><\/script>/gi,
    /<link[^>]*?href="([^"]+)"[^>]*>/gi,
    /<img[^>]*?src="([^"]+)"[^>]*>/gi,
    /<a[^>]*?href="([^"]+)"[^>]*>/gi,
  ];

  for (const pattern of patterns) {
    modified = modified.replace(pattern, (match, ref) => {
      if (isLocal(ref)) {
        const target = path.join(outputDir, cleanRef(ref));
        if (!fs.existsSync(target)) return "";
      }
      return match;
    });
  }

  if (modified !== html) {
    fs.writeFileSync(file, modified);
  }
}
