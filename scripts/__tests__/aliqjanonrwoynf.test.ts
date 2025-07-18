import fs from 'fs';
import path from 'path';

const EXPORT_DIR = process.env.NEXT_EXPORT_DIR || 'out';

function collectHtmlFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(full, files);
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

test('exported HTML does not reference missing files', () => {
  if (!fs.existsSync(EXPORT_DIR)) {
    console.warn(`Export directory '${EXPORT_DIR}' not found; skipping check.`);
    return;
  }
  const htmlFiles = collectHtmlFiles(EXPORT_DIR);
  const missing: string[] = [];
  const attrRegex = /(src|href)=\"([^\"]+)\"/g;
  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match: RegExpExecArray | null;
    while ((match = attrRegex.exec(content)) !== null) {
      const ref = match[2];
      if (/^https?:\/\//.test(ref) || ref.startsWith('#')) continue;
      const resolved = path.resolve(path.dirname(file), ref.split('#')[0].split('?')[0]);
      if (!fs.existsSync(resolved)) {
        missing.push(`${file} -> ${ref}`);
      }
    }
  }
  expect(missing).toEqual([]);
});
