import { execSync } from "child_process";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");

describe("backend TypeScript compilation", () => {
  test("tsc --noEmit succeeds", () => {
    try {
      execSync("npx tsc --noEmit -p backend/tsconfig.json", {
        cwd: repoRoot,
        stdio: "pipe",
      });
    } catch (err: any) {
      const output = err.stdout?.toString() || err.stderr?.toString() || err.message;
      const firstLine = output.split(/\r?\n/).find(Boolean) || "TypeScript compilation failed";
      throw new Error(firstLine);
    }
  });
});
