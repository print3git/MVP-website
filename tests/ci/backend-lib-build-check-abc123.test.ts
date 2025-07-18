import { execSync } from "child_process";
import fs from "fs";
import path from "path";

describe("backend build artifacts", () => {
  const repoRoot = path.resolve(__dirname, "../..");
  const backendDir = path.join(repoRoot, "backend");
  const libDir = path.join(backendDir, "lib");

  test("TypeScript output exists after build", () => {
    execSync("npm run build", { cwd: repoRoot, stdio: "inherit" });
    if (!fs.existsSync(libDir)) {
      throw new Error(
        `Missing ${path.relative(repoRoot, libDir)} directory after build. ` +
          `See docs/backend-build.md for help.`,
      );
    }
    const files = fs.readdirSync(libDir).filter((f) => f.endsWith(".js"));
    if (files.length === 0) {
      throw new Error(
        `No compiled JS files found in ${path.relative(repoRoot, libDir)}. ` +
          `See docs/backend-build.md for help.`,
      );
    }
  });
});
