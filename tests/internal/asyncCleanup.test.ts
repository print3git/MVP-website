import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

describe("async cleanup", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const env = {
    ...process.env,
    SKIP_PW_DEPS: "1",
    SKIP_NET_CHECKS: "1",
    SKIP_DB_CHECK: "1",
  };

  function createTest(leak: boolean) {
    const base = path.join(repoRoot, "backend", "tests", "__temp__");
    fs.mkdirSync(base, { recursive: true });
    const dir = fs.mkdtempSync(path.join(base, "async-cleanup-"));
    const file = path.join(dir, "resource.test.js");
    const content = leak
      ? `const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
let dbServer, client, app, stripe;

beforeAll(done => {
  dbServer = net.createServer().listen(0, () => {
    client = net.createConnection(dbServer.address().port, done);
  });
});

beforeAll(() => {
  app = http.createServer((req, res) => res.end('ok'));
  return new Promise(r => app.listen(0, r));
});

beforeAll(() => {
  stripe = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000);']);
});

test('leaks handles', () => {
  expect(true).toBe(true);
});
`
      : `const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
let dbServer, client, app, stripe;

beforeAll(done => {
  dbServer = net.createServer().listen(0, () => {
    client = net.createConnection(dbServer.address().port, done);
  });
});

beforeAll(() => {
  app = http.createServer((req, res) => res.end('ok'));
  return new Promise(r => app.listen(0, r));
});

beforeAll(() => {
  stripe = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000);']);
});

afterAll(() => {
  if (client) client.end();
  if (dbServer) dbServer.close();
  if (app) app.close();
  if (stripe) stripe.kill();
});

test('cleans up handles', () => {
  expect(true).toBe(true);
});
`;
    fs.writeFileSync(file, content);
    return { dir, file };
  }

  test("handles close properly", () => {
    const { dir, file } = createTest(false);
    const start = Date.now();
    const res = spawnSync(
      "node",
      ["scripts/run-jest.js", "--coverage=false", "--coverageThreshold={}", file],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env,
      },
    );
    fs.rmSync(dir, { recursive: true, force: true });
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    expect(res.status).toBe(0);
    expect(Date.now() - start).toBeLessThan(10000);
  });

  test("fails on dangling handles", () => {
    const { dir, file } = createTest(true);
    const res = spawnSync(
      "node",
      ["scripts/run-jest.js", "--coverage=false", "--coverageThreshold={}", file],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env,
      },
    );
    fs.rmSync(dir, { recursive: true, force: true });
    const output = `${res.stdout}\n${res.stderr}`;
    expect(res.status).not.toBe(0);
    expect(output).toMatch(/Teardown detected lingering handles/);
  });
});
