const fs = require("fs");
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const missing = [];
for (const [dep] of Object.entries(pkg.devDependencies || {})) {
  if (!lock.packages || !lock.packages[`node_modules/${dep}`]) {
    missing.push(dep);
  }
}
if (missing.length) {
  console.error("Lock file missing dependencies:", missing.join(", "));
  process.exit(1);
}
