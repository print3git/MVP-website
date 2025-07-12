const fs = require("fs");
const YAML = require("yaml");

const npmLock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pnpmLock = YAML.parse(fs.readFileSync("pnpm-lock.yaml", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const importer = pnpmLock.importers && pnpmLock.importers["."];

const missing = [];
for (const dep of Object.keys(pkg.devDependencies || {})) {
  if (!npmLock.packages || !npmLock.packages[`node_modules/${dep}`]) {
    missing.push(dep + " (npm)");
  }
  if (!importer || !(importer.devDependencies || {})[dep]) {
    missing.push(dep + " (pnpm)");
  }
}

if (missing.length) {
  console.error("Lock file missing dependencies:", missing.join(", "));
  process.exit(1);
}
