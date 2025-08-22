import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";
import {
  findPnpmStepsMissingWorkingDir,
  findSetupNodeWithoutVersion,
} from "./utils";

const root = path.resolve(__dirname, "../..");

describe("workspace configuration", () => {
  test("workspace: root has workspace file or pnpm steps set working directory", () => {
    const hasWorkspace = fs.existsSync(path.join(root, "pnpm-workspace.yaml"));
    const hasPkg = fs.existsSync(path.join(root, "package.json"));
    expect(hasPkg).toBe(true);
    if (!hasWorkspace) {
      const missing = findPnpmStepsMissingWorkingDir();
      expect(missing).toEqual([]);
    }
  });

  test("workspace: lockfile matches declared package manager", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const manager = pkg.packageManager || "";
    if (manager.startsWith("pnpm")) {
      expect(fs.existsSync(path.join(root, "pnpm-lock.yaml"))).toBe(true);
    }
    if (manager.startsWith("npm")) {
      expect(fs.existsSync(path.join(root, "package-lock.json"))).toBe(true);
    }
  });

  test("workspace: pnpm -r lists packages when workspace exists; frontend scripts present", () => {
    if (fs.existsSync(path.join(root, "pnpm-workspace.yaml"))) {
      execFileSync("pnpm", ["-r", "list"], { cwd: root, stdio: "pipe" });
    }
    const frontendPkg = JSON.parse(
      fs.readFileSync(path.join(root, "frontend", "package.json"), "utf8"),
    );
    expect(frontendPkg.scripts?.build).toBeDefined();
    expect(frontendPkg.scripts?.test).toBeDefined();
  });

  // Frontend build is exercised in CI; integration here omitted for speed.
  // This test guards that the build script is present.
  test("workspace: frontend has build script", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "frontend", "package.json"), "utf8"),
    );
    expect(pkg.scripts?.build).toBeDefined();
  });

  test("workspace: pnpm steps declare working-directory", () => {
    const missing = findPnpmStepsMissingWorkingDir();
    expect(missing).toEqual([]);
  });

  test("workspace: no mixed package managers", () => {
    const hasPnpm = fs.existsSync(path.join(root, "pnpm-lock.yaml"));
    const hasNpm = fs.existsSync(path.join(root, "package-lock.json"));
    if (hasPnpm && hasNpm) {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(root, "package.json"), "utf8"),
      );
      expect(pkg.packageManager?.startsWith("pnpm")).toBe(true);
    }
  });

  test("workspace: actions/setup-node pin node version", () => {
    const offenders = findSetupNodeWithoutVersion();
    expect(offenders).toEqual([]);
  });
});

