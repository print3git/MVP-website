import fs from 'fs';
import path from 'path';

describe('test discovery', () => {
  test('finds non-config spec files', async () => {
    const testsDir = path.resolve(__dirname, '..');
    let files: string[] = [];

    try {
      // Prefer fast-glob if available
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fg = require('fast-glob');
      files = fg.sync(['**/*.spec.{ts,js}'], {
        cwd: testsDir,
        ignore: ['config/**', 'smoke/**', 'openapi/**'],
        absolute: true,
      });
    } catch {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { globSync } = require('glob');
        files = globSync('**/*.spec.{ts,js}', {
          cwd: testsDir,
          ignore: ['config/**', 'smoke/**', 'openapi/**'],
          absolute: true,
        });
      } catch {
        const recurse = (dir: string): void => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              if (['config', 'smoke', 'openapi'].includes(entry.name)) continue;
              recurse(full);
            } else if (/\.spec\.(ts|js)$/.test(entry.name)) {
              files.push(full);
            }
          }
        };
        recurse(testsDir);
      }
    }

    expect(files.length).toBeGreaterThan(0);
  });
});
