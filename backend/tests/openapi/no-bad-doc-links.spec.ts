import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..', '..');
const docDirs = [path.resolve(rootDir, '..', 'docs'), path.resolve(rootDir, 'docs')].filter((d) =>
  fs.existsSync(d) && fs.statSync(d).isDirectory(),
);

const testFn = docDirs.length === 0 ? test.skip : test;

testFn('no references to /api/generate-model in docs', () => {
  const badFiles: string[] = [];
  for (const dir of docDirs) {
    const walk = (d: string): void => {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const contents = fs.readFileSync(full, 'utf8');
          if (contents.includes('/api/generate-model')) {
            badFiles.push(full);
          }
        }
      }
    };
    walk(dir);
  }
  expect(badFiles).toEqual([]);
});
