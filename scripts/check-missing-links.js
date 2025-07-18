const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dir = process.argv[2] ? path.resolve(root, process.argv[2]) : root;

function walk(d) {
  if (path.basename(d) === "node_modules") return;
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(d, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.isFile() && e.name.endsWith(".html")) {
      checkFile(full);
    }
  }
}

const missing = [];

function checkFile(file) {
  const html = fs.readFileSync(file, "utf8");
  const regex = /(src|href)="(.*?)"/g;
  let match;
  while ((match = regex.exec(html))) {
    const url = match[2];
    if (
      !url ||
      url.startsWith("http") ||
      url.startsWith("https") ||
      url.startsWith("data:") ||
      url.startsWith("#") ||
      url === "about:blank"
    ) {
      continue;
    }
    const target = path.resolve(path.dirname(file), url.split("?")[0]);
    if (!fs.existsSync(target)) {
      missing.push(`${file}: ${url}`);
    }
  }
}

walk(dir);

if (missing.length) {
  console.error("Missing file references detected:");
  for (const m of missing) console.error(" -", m);
  process.exit(1);
} else {
  console.log("All referenced files exist.");
}
