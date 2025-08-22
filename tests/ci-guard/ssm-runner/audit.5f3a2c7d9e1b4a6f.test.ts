import fs from 'fs';
import os from 'os';
import path from 'path';
import { auditWorkflows, humanSummary, chooseRunner, writeSummary } from '../../../scripts/ci-guard/ssm-runner/audit';
import { execSync } from 'child_process';

describe('ssm-runner audit', () => {
  function tmpDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'wf-'));
  }

  test('t1 bootstrap workflow present with OIDC permissions', () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, 'runner-ssm-bootstrap.yml'),
      `jobs:\n  bootstrap:\n    permissions:\n      id-token: write\n      actions: write\n    steps: []`,
    );
    const res = auditWorkflows(dir);
    expect(res.bootstrap?.permissions).toBe(true);
  });

  test('t2 bootstrap uses actions/github-script to fetch a registration token', () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, 'runner-ssm-bootstrap.yml'),
      `jobs:\n  bootstrap:\n    steps:\n      - uses: actions/github-script@v7\n      - run: echo ok`,
    );
    const res = auditWorkflows(dir);
    expect(res.bootstrap?.githubScript).toBe(true);
  });

  test('t3 send-command includes instance-id or tag target', () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, 'runner-ssm-bootstrap.yml'),
      `jobs:\n  bootstrap:\n    steps:\n      - run: aws ssm send-command --instance-ids i-123`,
    );
    const res = auditWorkflows(dir);
    expect(res.bootstrap?.sendCommand).toBe(true);
  });

  test('t4 no token printed in logs', () => {
    const dir = tmpDir();
    fs.writeFileSync(
      path.join(dir, 'runner-ssm-bootstrap.yml'),
      `jobs:\n  bootstrap:\n    steps:\n      - run: echo token $TOKEN`,
    );
    const res = auditWorkflows(dir);
    expect(res.bootstrap?.tokenSafe).toBe(false);
  });

  test('t5 selfhosted-prefer outputs self-hosted label when a runner exists', () => {
    const res = chooseRunner(['mvp-gh-runner'], 'mvp-gh-runner', 'ubuntu-latest');
    expect(res).toBe('mvp-gh-runner');
  });

  test('t6 selfhosted-prefer falls back to ubuntu-latest if none online', () => {
    const res = chooseRunner([], 'mvp-gh-runner', 'ubuntu-latest');
    expect(res).toBe('ubuntu-latest');
  });

  test('t7 workflows do NOT require inbound port 22 anywhere', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'a.yml'), `jobs:\n  x:\n    steps:\n      - run: echo hello`);
    const res = auditWorkflows(dir);
    expect(res.sshPorts.length).toBe(0);
  });

  test('t8 systemd unit name format validated in install.sh', () => {
    const content = fs.readFileSync(path.join('scripts', 'ssm-runner', 'install.sh'), 'utf8');
    expect(
      /SERVICE="actions\.runner\.\$\{REPO\/\/\\\/\/\.\}\.\$\{LABEL\}\.service"/.test(content),
    ).toBe(true);
  });

  test('t9 shellcheck/lint pass on scripts/ssm-runner/*.sh', () => {
    execSync('shellcheck scripts/ssm-runner/*.sh');
  });

  test('t10 install script includes idempotency check', () => {
    const content = fs.readFileSync(path.join('scripts', 'ssm-runner', 'install.sh'), 'utf8');
    expect(/systemctl is-active --quiet/.test(content)).toBe(true);
  });

  test('t11 labels input default is mvp-gh-runner and used', () => {
    const content = fs.readFileSync(path.join('scripts', 'ssm-runner', 'install.sh'), 'utf8');
    expect(/LABEL="mvp-gh-runner"/.test(content)).toBe(true);
    expect(/--labels "self-hosted,linux,x64,\$\{LABEL\}"/.test(content)).toBe(true);
  });

  test('t12 summary artifacts generated on success and failure', () => {
    const good = tmpDir();
    fs.writeFileSync(path.join(good, 'runner-ssm-bootstrap.yml'), `jobs:\n  bootstrap:\n    steps: []`);
    const bad = tmpDir();
    fs.writeFileSync(path.join(bad, 'runner-ssm-bootstrap.yml'), `jobs: {}`);
    const goodSummary = auditWorkflows(good);
    writeSummary(goodSummary, good);
    const badSummary = auditWorkflows(bad);
    writeSummary(badSummary, bad);
    expect(fs.existsSync(path.join(good, 'ssm-runner-audit.json'))).toBe(true);
    expect(fs.existsSync(path.join(bad, 'ssm-runner-audit.json'))).toBe(true);
  });
});
