const path = require("path");
const { spawnSync } = require("child_process");

const script = path.join(
  __dirname,
  "..",
  "..",
  "scripts",
  "ensure-root-deps.js",
);
const plugin = path.join(
  __dirname,
  "..",
  "..",
  "node_modules",
  "@babel",
  "plugin-syntax-typescript",
  "package.json",
);

describe("ensure-root-deps", () => {
  test("installs deps when plugin missing", () => {
    const code = `
      const fs = require('fs');
      const cp = require('child_process');
      const realExists = fs.existsSync;
      const calls = [];
      fs.existsSync = (p) => p === ${JSON.stringify(plugin)} ? false : realExists.call(fs, p);
      cp.execSync = (cmd) => { calls.push(cmd); return Buffer.from(''); };
      process.on('exit', () => console.log('CALLS:' + JSON.stringify(calls)));
      require(${JSON.stringify(script)});
    `;
    const res = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
    const match = /CALLS:(.*)/.exec(res.stdout);
    expect(match).not.toBeNull();
    const calls = JSON.parse(match[1]);
    expect(calls.some((c) => c.includes("npm ci"))).toBe(true);
  });
});
