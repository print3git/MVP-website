import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';

const fixtures = path.resolve(__dirname, '__fixtures__');

test('iam.json includes AmazonSSMManagedInstanceCore', () => {
  const data = JSON.parse(fs.readFileSync(path.join(fixtures, 'iam.json'), 'utf8'));
  expect(data.ManagedPolicies).toContain('arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore');
});

test('user-data.sh creates systemd unit with WantedBy=multi-user.target', () => {
  const content = fs.readFileSync(path.join(fixtures, 'user-data.sh'), 'utf8');
  expect(content).toMatch(/WantedBy=multi-user.target/);
});

test('install.sh is idempotent (second run no-op)', () => {
  const script = path.join(fixtures, 'install.sh');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-'));
  const env = {...process.env, INSTALL_DIR: dir};
  const first = execFileSync(script, {env}).toString().trim();
  const second = execFileSync(script, {env}).toString().trim();
  expect(first).toBe('installed');
  expect(second).toBe('already installed');
});

test('labels include self-hosted, linux, x64, mvp-gh-runner', () => {
  const labels = JSON.parse(fs.readFileSync(path.join(fixtures, 'labels.json'), 'utf8'));
  expect(labels).toEqual(expect.arrayContaining(['self-hosted', 'linux', 'x64', 'mvp-gh-runner']));
});
