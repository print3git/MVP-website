import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const data = JSON.parse(readFileSync(join(__dirname, '..', '..', 'ci', 'catalog.json'), 'utf8')) as {
  suites: { id: string; type?: string; paths?: string[] }[];
};

let md = '# CI Catalog\n\n';
for (const suite of data.suites) {
  md += `- **${suite.id}** (${suite.type ?? 'unknown'})`;
  if (suite.paths) {
    md += ` — paths: ${suite.paths.join(', ')}`;
  }
  md += '\n';
}

writeFileSync(join(__dirname, '..', '..', 'docs', 'ci', 'catalog.md'), md);
