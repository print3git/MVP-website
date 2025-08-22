import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { parse, stringify } from 'yaml';

const workflowsDir = join(__dirname, '..', '..', '.github', 'workflows');
const mapping: Record<string, string[]> = {};

for (const file of readdirSync(workflowsDir)) {
  if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
  try {
    const content = parse(readFileSync(join(workflowsDir, file), 'utf8')) as any;
    if (content && content.jobs) {
      for (const jobName of Object.keys(content.jobs)) {
        if (!mapping[jobName]) mapping[jobName] = [jobName];
      }
    }
  } catch {
    // skip files that cannot be parsed
    continue;
  }
}

const out = stringify({ expected: mapping });
writeFileSync(join(__dirname, '..', '..', 'ci', 'expected-suites.yml'), out);
