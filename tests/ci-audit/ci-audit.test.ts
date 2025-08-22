import { describe, it, expect } from "vitest";
import { execa } from "execa";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import nock from "nock";

function setupRepo(opts: {
  workflow?: string;
  backend?: boolean;
  requiredChecks?: any;
}) {
  const dir = mkdtempSync(join(tmpdir(), "ci-audit-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  copyFileSync(
    resolve(__dirname, "../../scripts/ci-audit.ts"),
    join(dir, "scripts", "ci-audit.ts"),
  );
  try {
    // symlink node_modules so dependencies like yaml resolve
    // @ts-ignore
    require("fs").symlinkSync(
      resolve(__dirname, "../../node_modules"),
      join(dir, "node_modules"),
      "junction",
    );
  } catch {}
  if (opts.workflow) {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    copyFileSync(
      resolve(__dirname, "../fixtures/ci-audit", opts.workflow),
      join(dir, ".github", "workflows", opts.workflow),
    );
  }
  writeFileSync(join(dir, "package.json"), '{"name":"tmp"}');
  if (opts.backend) {
    mkdirSync(join(dir, "backend"), { recursive: true });
    writeFileSync(join(dir, "backend", "package.json"), '{"name":"backend"}');
  }
  if (opts.requiredChecks) {
    mkdirSync(join(dir, "ci"), { recursive: true });
    writeFileSync(
      join(dir, "ci", "required-checks.json"),
      JSON.stringify(opts.requiredChecks),
    );
  }
  return dir;
}

describe("ci-audit suite", () => {
  it("ci-audit: runs successfully with normal repo state", async () => {
    const result = await execa("node", ["scripts/ci-audit.ts"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Missing packages:");
  });

  it("ci-audit: missing runtime dependency", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ci-audit-missing-"));
    mkdirSync(join(dir, "scripts"), { recursive: true });
    copyFileSync(
      resolve(__dirname, "../../scripts/ci-audit.ts"),
      join(dir, "scripts", "ci-audit.ts"),
    );
    let error: any;
    try {
      await execa("node", ["scripts/ci-audit.ts"], { cwd: dir });
    } catch (e) {
      error = e;
    }
    expect(error).toBeTruthy();
    expect(String(error?.stderr || error?.stdout)).toMatch(
      /Cannot find module 'yaml'|missing dependency/i,
    );
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: invalid YAML input", async () => {
    const dir = setupRepo({ workflow: "bad.yaml" });
    const { exitCode, stderr } = await execa("node", ["scripts/ci-audit.ts"], {
      cwd: dir,
      reject: false,
    });
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/bad\.yaml:.*line/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: missing expected config files", async () => {
    const dir = setupRepo({
      workflow: "good.yaml",
      backend: true,
      requiredChecks: ["missing-check"],
    });
    const { exitCode, stderr, stdout } = await execa(
      "node",
      ["scripts/ci-audit.ts"],
      {
        cwd: dir,
        reject: false,
      },
    );
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/Missing required checks/);
    expect(stdout).toMatch(/Missing packages: backend/);
    rmSync(dir, { recursive: true, force: true });
  });

  it.skip("ci-audit: node version guard", async () => {
    // Node <18 simulation not implemented; test skipped.
  });

  it("ci-audit: completes under 5s without network calls", async () => {
    const dir = setupRepo({ workflow: "good.yaml" });
    nock.disableNetConnect();
    const start = Date.now();
    const { exitCode } = await execa("node", ["scripts/ci-audit.ts"], {
      cwd: dir,
    });
    const duration = Date.now() - start;
    expect(exitCode).toBe(0);
    expect(duration).toBeLessThan(5000);
    nock.enableNetConnect();
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: logs structured summary without stack traces", async () => {
    const dir = setupRepo({ workflow: "good.yaml" });
    const { stdout } = await execa("node", ["scripts/ci-audit.ts"], {
      cwd: dir,
    });
    expect(stdout).not.toMatch(/Error:/);
    expect(stdout).toMatchSnapshot();
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: handles --help and unknown flags", async () => {
    const dir = setupRepo({ workflow: "good.yaml" });
    const resHelp = await execa("node", ["scripts/ci-audit.ts", "--help"], {
      cwd: dir,
    });
    expect(resHelp.exitCode).toBe(0);
    const resUnknown = await execa("node", ["scripts/ci-audit.ts", "--bogus"], {
      cwd: dir,
    });
    expect(resUnknown.exitCode).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: non-TTY environment behaves the same", async () => {
    const dir = setupRepo({ workflow: "good.yaml" });
    const { stdout } = await execa("node", ["scripts/ci-audit.ts"], {
      cwd: dir,
      env: { CI: "1" },
    });
    expect(stdout).toContain("Missing packages: none");
    rmSync(dir, { recursive: true, force: true });
  });

  it("ci-audit: exit codes mapping", async () => {
    const goodDir = setupRepo({ workflow: "good.yaml" });
    const good = await execa("node", ["scripts/ci-audit.ts"], { cwd: goodDir });
    expect(good.exitCode).toBe(0);
    rmSync(goodDir, { recursive: true, force: true });

    const badDir = setupRepo({ workflow: "bad.yaml" });
    const bad = await execa("node", ["scripts/ci-audit.ts"], {
      cwd: badDir,
      reject: false,
    });
    expect(bad.exitCode).not.toBe(0);
    rmSync(badDir, { recursive: true, force: true });

    const missingDir = mkdtempSync(join(tmpdir(), "ci-audit-missing-"));
    mkdirSync(join(missingDir, "scripts"), { recursive: true });
    copyFileSync(
      resolve(__dirname, "../../scripts/ci-audit.ts"),
      join(missingDir, "scripts", "ci-audit.ts"),
    );
    let code = 0;
    try {
      await execa("node", ["scripts/ci-audit.ts"], { cwd: missingDir });
    } catch (e: any) {
      code = e.exitCode || 1;
    }
    expect(code).not.toBe(0);
    rmSync(missingDir, { recursive: true, force: true });
  });
});
