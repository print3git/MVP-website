import { execSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const script = path.join(
  repoRoot,
  "scripts",
  "check-broken-symlinks-9ac8f74db5e1c32.ts",
);

test("symlink check script compiles and runs", () => {
  execSync(`npx ts-node --skipProject ${script} scripts`, {
    cwd: repoRoot,
    stdio: "inherit",
  });
});
