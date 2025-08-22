import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';

const patterns = [/mkdir\s+-p\s+ci\/diag/, /journalctl/, /\bdmesg\b/];

export function scanWorkflows(root = process.cwd()): string[] {
  const workflowDir = path.join(root, '.github', 'workflows');
  const files = fg.sync('**/*.{yml,yaml}', { cwd: workflowDir, absolute: true });
  const offenders: string[] = [];

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, idx) => {
      if (patterns.some((p) => p.test(line))) {
        offenders.push(`${path.relative(root, file)}:${idx + 1}`);
      }
    });
  }
  return offenders;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const offenders = scanWorkflows();
  if (offenders.length) {
    console.error(
      'Inline diagnostic collection detected. Use ./.github/actions/collect-diag instead:\n' +
        offenders.join('\n'),
    );
    process.exitCode = 1;
  }
}
