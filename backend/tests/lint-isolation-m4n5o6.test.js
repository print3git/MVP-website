const { spawnSync } = require("child_process");
const path = require("path");

test("routes/users.js passes ESLint", () => {
  const file = path.join(__dirname, "..", "routes", "users.js");
  const result = spawnSync("npx", ["eslint", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `ESLint failed for ${file}:\n${result.stdout}${result.stderr}`,
    );
  }
  expect(result.status).toBe(0);
});
