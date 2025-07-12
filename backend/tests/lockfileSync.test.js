const fs = require('fs');
const { execSync } = require('child_process');

describe('lockfile sync', () => {
  const lockFiles = [
    'package-lock.json',
    'backend/package-lock.json',
    'backend/hunyuan_server/package-lock.json',
  ];

  lockFiles.forEach((file) => {
    if (!fs.existsSync(file)) return;
    test(`${file} matches git`, () => {
      expect(() => {
        execSync(`git diff --quiet HEAD -- ${file}`);
      }).not.toThrow();
    });
  });
});
