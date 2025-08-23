import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { execFileSync } from "child_process";

type Dir = string;
const script = path.resolve(
  __dirname,
  "../../scripts/ci-guards/check-pnpm-usage.js",
);

function setup(pkgManager = "pnpm@9.0.0"): Dir {
  const dir = mkdtempSync(path.join(tmpdir(), "pnpm-guard-"));
  mkdirSync(path.join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ packageManager: pkgManager }, null, 2),
  );
  return dir;
}

function run(dir: Dir) {
  return execFileSync("node", [script, dir], { encoding: "utf8" });
}

describe("check-pnpm-usage", () => {
  test("workflow with pnpm install but no setup fails", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - run: pnpm install
`,
    );
    expect(() => run(dir)).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  test("workflow with pnpm/action-setup then install passes", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm install
`,
    );
    run(dir);
    rmSync(dir, { recursive: true, force: true });
  });

  test("package.json with pnpm but no setup fails", () => {
    const dir = setup("pnpm@8.0.0");
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - run: pnpm install
`,
    );
    expect(() => run(dir)).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  test("mismatched pnpm version fails", () => {
    const dir = setup("pnpm@9");
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - run: pnpm install
`,
    );
    expect(() => run(dir)).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  test("setup on linux but missing on windows job fails", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  linux:
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm install
  windows:
    steps:
      - run: pnpm install
`,
    );
    expect(() => run(dir)).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  test("matrix with setup passes", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm install
`,
    );
    run(dir);
    rmSync(dir, { recursive: true, force: true });
  });

  test("actions/setup-node cache pnpm without setup fails", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - uses: actions/setup-node@v4
        with:
          cache: pnpm
      - run: pnpm install
`,
    );
    expect(() => run(dir)).toThrow();
    rmSync(dir, { recursive: true, force: true });
  });

  test("workflow using only npm passes", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - run: npm install
`,
    );
    run(dir);
    rmSync(dir, { recursive: true, force: true });
  });

  test("pnpm --version smoke step passes", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  build:
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm --version
`,
    );
    run(dir);
    rmSync(dir, { recursive: true, force: true });
  });

  test("multiple jobs only flag misconfigured ones", () => {
    const dir = setup();
    writeFileSync(
      path.join(dir, ".github/workflows/test.yml"),
      `jobs:
  good:
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm install
  bad:
    steps:
      - run: pnpm install
`,
    );
    try {
      run(dir);
      throw new Error("expected failure");
    } catch (e: any) {
      const out = e.stdout.toString();
      const json = JSON.parse(out.split("\n\n")[0]);
      const good = json.find((r: any) => r.job === "good");
      const bad = json.find((r: any) => r.job === "bad");
      expect(good.ok).toBe(true);
      expect(bad.ok).toBe(false);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});
