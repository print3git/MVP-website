const { spawnSync } = require("child_process");
const path = require("path");

const file = path.join(__dirname, "..", "src", "utils", "incentives.js");

test("src/utils/incentives.js lints cleanly", () => {
  const res = spawnSync("npx", ["eslint", file], { encoding: "utf8" });
  if (res.status !== 0) {
    throw new Error(`ESLint failed for ${file}\n${res.stdout}${res.stderr}`);
  }
  expect(res.status).toBe(0);
});
