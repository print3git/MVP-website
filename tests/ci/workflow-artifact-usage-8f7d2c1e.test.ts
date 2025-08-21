import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';

const repoRoot = path.resolve(__dirname, '../..');

test('coverage workflow artifacts are uploaded and downloaded with retention', async () => {
  const coveragePath = path.join(repoRoot, '.github', 'workflows', 'coverage.yml');
  const coverage = YAML.parse(await fs.readFile(coveragePath, 'utf8'));
  const frontendActionPath = path.join(repoRoot, '.github', 'actions', 'frontend-build', 'action.yml');
  const frontendAction = YAML.parse(await fs.readFile(frontendActionPath, 'utf8'));

  const uploads = new Map<string, number>();
  const downloads = new Set<string>();

  for (const step of coverage.jobs['build-backend'].steps || []) {
    if (typeof step.uses === 'string' && step.uses.startsWith('actions/upload-artifact')) {
      uploads.set(step.with.name, step.with['retention-days']);
    }
  }

  for (const step of frontendAction.runs.steps || []) {
    if (typeof step.uses === 'string' && step.uses.startsWith('actions/upload-artifact')) {
      uploads.set(step.with.name, step.with['retention-days']);
    }
  }

  for (const step of coverage.jobs.coverage.steps || []) {
    if (typeof step.uses === 'string' && step.uses.startsWith('actions/download-artifact')) {
      downloads.add(step.with.name);
    }
  }

  const expected = [
    'backend-dist-${{ github.run_id }}',
    'frontend-dist-${{ github.run_id }}',
  ];

  for (const name of expected) {
    if (!uploads.has(name)) {
      throw new Error(`Missing upload for ${name}`);
    }
    const retention = uploads.get(name);
    if (typeof retention !== 'number' || retention < 3) {
      throw new Error(`Retention for ${name} is less than 3 days`);
    }
    if (!downloads.has(name)) {
      throw new Error(`Missing download for ${name}`);
    }
  }
});
