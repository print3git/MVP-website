const { execSync } = require("child_process");
const path = require("path");

test("utils/incentives.js passes ESLint", () => {
  const file = path.join(__dirname, "..", "src", "utils", "incentives.js");
  try {
    execSync(`npx eslint "${file}"`, { stdio: "pipe", encoding: "utf8" });
  } catch (err) {
    const output = `${err.stdout || ""}${err.stderr || ""}`;
    throw new Error(`ESLint failed for ${file}\n${output}`);
  }
});
