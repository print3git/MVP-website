import { readFileSync } from 'fs';
import { join } from 'path';

describe('dependencies present in lockfile', () => {
  const root = join(__dirname, '..', '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const lockDeps = lock.dependencies || {};
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  for (const dep of Object.keys(allDeps)) {
    it(`has ${dep} in package-lock.json`, () => {
      expect(lockDeps[dep]).toBeDefined();
    });
  }
});
