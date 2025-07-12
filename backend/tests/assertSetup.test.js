const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

test('assert-setup skips playwright deps when browsers exist', () => {
  const tmp = fs.mkdtempSync(path.join(__dirname, 'tmp-'));
  const browserDir = path.join(tmp, 'browsers');
  fs.mkdirSync(browserDir);
  fs.writeFileSync(path.join(browserDir, 'browser'), '');

  const script = path.resolve(__dirname, '../../scripts/assert-setup.js');
  const output = child_process.execSync(`node ${script}`, {
    cwd: tmp,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browserDir,
      ASSERT_SETUP_DRY_RUN: '1',
    },
  }).toString();

  expect(output).toContain('SKIP_PW_DEPS=1');
});
