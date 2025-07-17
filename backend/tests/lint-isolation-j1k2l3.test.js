const { execSync } = require("child_process");
const path = require("path");

test("backend/src/lib/uploadS3.js passes ESLint", () => {
  const repo = path.resolve(__dirname, "..", "..");
  const file = path.join(repo, "backend/src/lib/uploadS3.js");
  const eslint = path.join(repo, "node_modules", ".bin", "eslint");
  let output = "";
  let status = 0;
  try {
    execSync(`node --experimental-vm-modules ${eslint} "${file}"`, {
      cwd: repo,
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (err) {
    status = err.status ?? 1;
    output = `${err.stdout || ""}${err.stderr || ""}`;
  }
  if (status !== 0) {
    throw new Error(`ESLint failed for ${file}\n${output}`);
  }
  expect(status).toBe(0);
});
