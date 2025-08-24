const { spawnSync } = require("child_process");
const path = require("path");

test("server.js passes ESLint", () => {
  const file = path.join(__dirname, "..", "server.js");
  const result = spawnSync("npx", ["eslint", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `ESLint failed for ${file}:\n${result.stdout}${result.stderr}`,
    );
  }
  expect(result.status).toBe(0);
});
