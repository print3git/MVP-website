import { spawnSync } from "child_process";
import path from "path";

test("backend code satisfies lint rules", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const result = spawnSync(
    "npx",
    [
      "eslint",
      "backend",
      "--config",
      "backend/eslint.config.js",
      "--max-warnings=0",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    console.error(result.stdout || result.stderr);
  }
  expect(result.status).toBe(0);
});
