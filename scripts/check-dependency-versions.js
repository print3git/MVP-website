const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function checkDependencyVersions(pkgPath = path.join(process.cwd(), 'package.json')) {
  const absPath = path.resolve(pkgPath);
  const pkg = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const missing = [];
  for (const [name, version] of Object.entries(deps)) {
    try {
      execSync(`npm view ${name}@${version} version`, { stdio: 'ignore' });
    } catch (err) {
      missing.push(`${name}@${version}`);
    }
  }
  if (missing.length > 0) {
    for (const dep of missing) {
      if (process.env.GITHUB_ACTIONS) {
        console.warn(`::warning::missing package version ${dep}`);
      } else {
        console.error(`missing package version ${dep}`);
      }
    }
    process.exit(1);
  }
}

if (require.main === module) {
  const target = process.argv[2];
  checkDependencyVersions(target);
}

module.exports = { checkDependencyVersions };
