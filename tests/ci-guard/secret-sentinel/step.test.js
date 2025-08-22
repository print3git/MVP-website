import { execSync } from "child_process";
import path from "path";

describe("secret sentinel guard", () => {
  test("managed block present", () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    execSync("bash scripts/ci-guard/secret-sentinel/check.sh", {
      cwd: repoRoot,
      stdio: "inherit",
    });
  });
});
