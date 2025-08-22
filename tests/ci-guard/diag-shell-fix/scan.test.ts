import { execSync } from "child_process";
import path from "path";

describe("diag shell fix guard", () => {
  test("no invalid shells", () => {
    const repoRoot = path.resolve(__dirname, "../../..");
    execSync("scripts/ci-guard/diag-shell-fix/scan.sh", { cwd: repoRoot, stdio: "inherit" });
  });
});
