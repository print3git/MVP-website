const { execFileSync } = require("child_process");

function run(cmd, args, env = {}) {
  try {
    execFileSync(cmd, args, { stdio: "pipe", env: { ...process.env, ...env } });
    return 0;
  } catch (err) {
    return err.status || 1;
  }
}

test("npx jest is unavailable at repo root", () => {
  const code = run("npx", ["--no-install", "jest", "--version"]);
  expect(code).not.toBe(0);
});
