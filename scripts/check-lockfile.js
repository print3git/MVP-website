const fs = require("fs");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));

const declaredDeps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
};

const missing = Object.keys(declaredDeps).filter(
  (dep) => !lock.packages || !lock.packages[`node_modules/${dep}`],
);

if (missing.length) {
  console.error("Dependencies missing from package-lock.json:");
  for (const dep of missing) {
    console.error(` - ${dep}`);
  }
  process.exit(1);
}

console.log("All dependencies are present in package-lock.json");
