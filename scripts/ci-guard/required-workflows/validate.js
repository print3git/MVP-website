const fs = require('fs');
const path = require('path');

function validate(configPath = path.join('ci-guard','required-workflows','list.json'), baseDir = '.github/workflows') {
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const missing = cfg.paths.filter(p => !fs.existsSync(path.join(baseDir, p)));
  return { missing, mode: cfg.mode };
}

if (require.main === module) {
  const { missing, mode } = validate();
  if (missing.length) {
    console.log('Missing workflow files:', missing.join(', '));
    if (mode === 'fail') {
      process.exit(1);
    }
  } else {
    console.log('All required workflows present.');
  }
}

module.exports = { validate };
