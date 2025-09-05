import { readFileSync } from 'fs';
import { join } from 'path';

describe('lockfile has no extraneous deps', () => {
  const root = join(__dirname, '..', '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const lockDeps = lock.dependencies || {};
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  for (const dep of Object.keys(lockDeps)) {
    it(`lockfile dependency ${dep} listed in package.json`, () => {
      expect(allDeps[dep]).toBeDefined();
    });
  }
});
