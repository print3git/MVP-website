const fs = require("fs");
const yaml = require("yaml");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = yaml.parse(fs.readFileSync("pnpm-lock.yaml", "utf8"));
const importer = lock.importers["."] || {};
const mismatched = [];
function check(deps, lockDeps) {
  for (const [name, spec] of Object.entries(deps || {})) {
    const entry = lockDeps && lockDeps[name];
    if (!entry || entry.specifier !== spec) {
      mismatched.push(name);
    }
  }
}
check(pkg.dependencies, importer.dependencies);
check(pkg.devDependencies, importer.devDependencies);
if (mismatched.length) {
  console.error("pnpm-lock.yaml out of sync for:", mismatched.join(", "));
  process.exit(1);
}
