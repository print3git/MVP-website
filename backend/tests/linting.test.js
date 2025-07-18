// backend/tests/linting.test.js
const { spawnSync } = require("child_process");

test("repository passes ESLint with no warnings", () => {
  // Run the lint script without --silent so we get all of ESLint’s output
  const result = spawnSync("npm", ["run", "lint"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: { ...process.env, NODE_V8_COVERAGE: "" },
  });

  // If ESLint found anything (exit code !== 0) or spawn failed, print it out
  if (result.error || result.status !== 0) {
    console.error("\n⛔ ESLint found problems:\n");
    if (result.stdout) console.error(result.stdout);
    if (result.stderr) console.error(result.stderr);
  }

  // Finally assert zero exit code
  expect(result.status).toBe(0);
});
