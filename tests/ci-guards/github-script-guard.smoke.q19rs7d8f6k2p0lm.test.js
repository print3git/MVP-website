const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const assert = require("assert");

test("fails on forbidden requires", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guard-bad-"));
  const wfDir = path.join(tmp, ".github", "workflows");
  fs.mkdirSync(wfDir, { recursive: true });
  fs.writeFileSync(
    path.join(wfDir, "bad.yml"),
    `name: bad\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/github-script@v7\n        with:\n          script: |\n            const core = require('@actions/core')\n`,
  );
  const res = spawnSync(
    "node",
    [path.resolve("scripts/ci-guards/forbid-github-script-requires.js")],
    { cwd: tmp },
  );
  assert.notStrictEqual(res.status, 0);
});

test("passes on injected globals", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "guard-good-"));
  const wfDir = path.join(tmp, ".github", "workflows");
  fs.mkdirSync(wfDir, { recursive: true });
  fs.writeFileSync(
    path.join(wfDir, "good.yml"),
    `name: good\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/github-script@v7\n        with:\n          script: |\n            core.notice('ok')\n`,
  );
  const res = spawnSync(
    "node",
    [path.resolve("scripts/ci-guards/forbid-github-script-requires.js")],
    { cwd: tmp },
  );
  assert.strictEqual(res.status, 0, res.stderr.toString());
});
