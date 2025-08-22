import fs from "fs";
import os from "os";
import path from "path";
import { audit } from "../../../scripts/ci-guard/single-lockfile-policy/audit";

type FileMap = Record<string, string>;

function setupRepo(files: FileMap): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  for (const [file, content] of Object.entries(files)) {
    const full = path.join(dir, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

afterEach(() => {
  fs.rmSync(process.env.TMP_REPO || "", { recursive: true, force: true });
  delete process.env.TMP_REPO;
});

function run(files: FileMap) {
  const dir = setupRepo(files);
  process.env.TMP_REPO = dir;
  return audit({
    repoRoot: dir,
    allowlistPath: path.join(
      dir,
      "ci-guard/single-lockfile-policy/allowlist.json",
    ),
  });
}

describe("single-lockfile-policy audit", () => {
  test("t1 Root pnpm-lock.yaml only → pass", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors).toHaveLength(0);
  });

  test("t2 Root package-lock.json only with packageManager=pnpm → fail", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "package-lock.json": "{}",
      ".npmrc": "package-lock=false",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("t3 Both lockfiles at root → fail", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      "package-lock.json": "{}",
      ".npmrc": "package-lock=false",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("t4 Workflows using npm ci when packageManager=pnpm → fail", () => {
    const workflow = `jobs:\n  build:\n    steps:\n      - run: npm ci`;
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      ".github/workflows/test.yml": workflow,
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors.some((e) => e.includes("runs npm"))).toBe(true);
  });

  test("t5 setup-node cache:'npm' alongside pnpm → fail", () => {
    const workflow = `jobs:\n  build:\n    steps:\n      - uses: actions/setup-node@v4\n        with:\n          cache: npm\n      - run: pnpm install`;
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      ".github/workflows/test.yml": workflow,
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(
      result.errors.some((e) => e.includes("setup-node cache 'npm'")),
    ).toBe(true);
  });

  test("t6 action-setup pinned version mismatch vs packageManager → fail", () => {
    const workflow = `jobs:\n  build:\n    steps:\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 9.0.0\n      - run: pnpm install`;
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      ".github/workflows/test.yml": workflow,
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors.some((e) => e.includes("pnpm/action-setup"))).toBe(
      true,
    );
  });

  test("t7 Nested package-lock.json under examples/ and allowlisted → pass", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      "examples/package-lock.json": "{}",
      "ci-guard/single-lockfile-policy/allowlist.json":
        '{"packageLocks":["examples/package-lock.json"]}',
    });
    expect(result.errors).toHaveLength(0);
  });

  test("t8 Nested package-lock.json not allowlisted → fail", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      "packages/a/package-lock.json": "{}",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(
      result.errors.some((e) => e.includes("package-lock.json at packages/a")),
    ).toBe(true);
  });

  test("t9 Windows path handling → pass", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      "examples/package-lock.json": "{}",
      "ci-guard/single-lockfile-policy/allowlist.json":
        '{"packageLocks":["examples\\\\package-lock.json"]}',
    });
    expect(result.errors).toHaveLength(0);
  });

  test("t10 Monorepo roots (frontend/backend) each have pnpm-lock.yaml → pass", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      ".npmrc": "package-lock=false",
      "frontend/pnpm-lock.yaml": "",
      "backend/pnpm-lock.yaml": "",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.errors).toHaveLength(0);
  });

  test("t11 Missing .npmrc (package-lock=false) → warn", () => {
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "pnpm-lock.yaml": "",
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.warnings.some((w) => w.includes("package-lock=false"))).toBe(
      true,
    );
  });

  test("t12 Summary artifact lists all violations with remediation text", () => {
    const workflow = `jobs:\n  build:\n    steps:\n      - run: npm ci`;
    const result = run({
      "package.json": '{"packageManager":"pnpm@10.0.0"}',
      "package-lock.json": "{}",
      ".github/workflows/test.yml": workflow,
      "ci-guard/single-lockfile-policy/allowlist.json": '{"packageLocks":[]}',
    });
    expect(result.summary).toMatch(/packageManager declares pnpm/);
    expect(result.summary).toMatch(/runs npm/);
  });
});
