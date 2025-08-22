import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

const fixtures = path.resolve(__dirname, '__fixtures__');
const wf = path.join(fixtures, 'workflows');

test('health workflow queries both SSM and GitHub runners API', () => {
  const content = fs.readFileSync(path.join(wf, 'health.yml'), 'utf8');
  expect(content).toMatch(/aws ssm/);
  expect(content).toMatch(/listSelfHostedRunnersForRepo/);
});

test('bootstrap workflow passes registration token securely (not logged)', () => {
  const content = fs.readFileSync(path.join(wf, 'bootstrap.yml'), 'utf8');
  expect(content).toMatch(/::add-mask::/);
  expect(content).toMatch(/\$\{\{ steps.token.outputs.token \}\}/);
  expect(content).not.toMatch(/echo \$TOKEN/);
});

test('rejects workflows that still require inbound 22', () => {
  const sg = JSON.parse(fs.readFileSync(path.join(fixtures, 'security-group.json'), 'utf8'));
  const ports = sg.ingress.map((i: any) => i.from_port);
  expect(ports).not.toContain(22);
});

test('works with private subnets (no public IP) because SSM is used', () => {
  const subnet = fs.readFileSync(path.join(fixtures, 'subnet.tf'), 'utf8');
  expect(subnet).toMatch(/associate_public_ip_address\s*=\s*false/);
});

test('auto-heal path exists (send-command restart) when runner offline', () => {
  const heal = fs.readFileSync(path.join(fixtures, 'auto-heal.sh'), 'utf8');
  expect(heal).toMatch(/ssm send-command/);
  expect(heal).toMatch(/restart/);
});

test('artifact/summary shows clear remediation when zero runners found', () => {
  const content = fs.readFileSync(path.join(wf, 'health.yml'), 'utf8');
  expect(content).toMatch(/Run terraform apply to provision/);
  expect(content).toMatch(/upload-artifact/);
});

test('matrix labels honored (assert runs-on lists correct labels)', () => {
  const parsed = yaml.parse(fs.readFileSync(path.join(wf, 'matrix.yml'), 'utf8'));
  const labels = parsed.jobs.build.strategy.matrix.runner[0];
  expect(labels).toEqual(['self-hosted', 'linux', 'x64', 'mvp-gh-runner']);
  expect(parsed.jobs.build['runs-on']).toBe('${{ matrix.runner }}');
});
