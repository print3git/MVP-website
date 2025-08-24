#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const files = process.argv.slice(2);
const exts = new Set(['.js', '.jsx', '.ts', '.tsx']);

for (const file of files) {
  const ext = path.extname(file);
  if (!exts.has(ext)) continue;
  const dir = path.dirname(file);
  const base = path.basename(file, ext);
  const safeBase = base.replace(/[^A-Za-z0-9_$]/g, '_');
  const candidates = [`${base}.spec${ext}`, `${base}_test${ext}`];
  if (candidates.some((c) => fs.existsSync(path.join(dir, c)))) continue;
  const testFile = path.join(dir, candidates[0]);
  const importPath = `./${base}`;
  const importLine = ['.ts', '.tsx'].includes(ext)
    ? `import ${safeBase} from '${importPath}';\n\n`
    : `const ${safeBase} = require('${importPath}');\n\n`;
  const content = `${importLine}describe('${base}', () => {
  it('TODO: write tests for ${base}', () => {
    // TODO: implement tests
  });
});\n`;
  fs.writeFileSync(testFile, content, { flag: 'wx' });
  console.log(`Created ${testFile}`);
}
