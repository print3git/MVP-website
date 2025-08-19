import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import path from "path";

const repoRoot = path.resolve(__dirname, "../..");
const buildDir = path.join(repoRoot, "backend", "lib");
const expectedEntry = path.join(buildDir, "pricing.js");

function run(command: string, step: string): void {
  try {
    execSync(command, { cwd: repoRoot, stdio: "pipe" });
  } catch (err: any) {
    const output = err.stderr?.toString() || err.stdout?.toString() || err.message;
    throw new Error(`${step} failed:\n${output}`);
  }
}

describe("build pipeline diagnostics", () => {
  test("TypeScript compilation succeeds", () => {
    run("npx tsc --noEmit", "TypeScript compilation");
  });

  test("ESLint passes on TypeScript files", () => {
    run('npx eslint "**/*.{ts,tsx}"', "ESLint");
  });

  test("build command emits expected artifacts", () => {
    rmSync(buildDir, { recursive: true, force: true });
    run("npm run build", "Build");
    if (!existsSync(buildDir)) {
      throw new Error(`Build output directory missing: ${path.relative(repoRoot, buildDir)}`);
    }
    if (!existsSync(expectedEntry)) {
      throw new Error(
        `Expected entry point missing: ${path.relative(repoRoot, expectedEntry)}`,
      );
    }
  });
});
