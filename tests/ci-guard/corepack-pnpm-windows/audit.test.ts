import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/corepack-pnpm-windows/audit.ts",
);
const tsNode = [
  "-y",
  "ts-node",
  "--transpile-only",
  "--compiler-options",
  JSON.stringify({ module: "commonjs", moduleResolution: "node" }),
  script,
];

function run(cwd: string) {
  return spawnSync("npx", tsNode, { cwd, encoding: "utf8" });
}

function writeFile(dir: string, file: string, content: string) {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe("corepack pnpm windows guard", () => {
  test("windows job with block passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corepack-pass-"));
    writeFile(tmp, "pnpm-lock.yaml", "");
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      String.raw`name: t\njobs:\n  build:\n    runs-on: \${{ matrix.os }}\n    strategy:\n      fail-fast: false\n      matrix:\n        os: [ubuntu-latest, windows-latest]\n    steps:\n      - uses: actions/checkout@v4\n# >>> BEGIN MANAGED BLOCK: ci-guard:corepack-pnpm-windows\n      - name: Setup Node (Windows)\n        if: startsWith(runner.os, 'Windows')\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n          cache-dependency-path: |\n            pnpm-lock.yaml\n            frontend/pnpm-lock.yaml\n            backend/pnpm-lock.yaml\n\n      - name: Enable Corepack (Windows)\n        if: startsWith(runner.os, 'Windows')\n        shell: pwsh\n        run: corepack enable\n\n      - name: Prepare pnpm via Corepack (Windows)\n        if: startsWith(runner.os, 'Windows')\n        shell: pwsh\n        run: |\n          $pm = ""\n          try { $pm = (Get-Content package.json | ConvertFrom-Json).packageManager } catch {}\n          if ($pm -and $pm -match "^pnpm@") {\n            $ver = $pm.Split("@")[1]\n            corepack prepare "pnpm@$ver" --activate\n          } else {\n            corepack prepare pnpm@10 --activate\n          }\n\n      - name: Fallback: pnpm/action-setup (Windows)\n        if: startsWith(runner.os, 'Windows')\n        uses: pnpm/action-setup@v4\n        with:\n          run_install: false\n\n      - name: Verify pnpm (Windows)\n        if: startsWith(runner.os, 'Windows')\n        shell: pwsh\n        run: pnpm -v\n# <<< END MANAGED BLOCK: ci-guard:corepack-pnpm-windows\n      - run: echo ok\n`);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("missing block fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corepack-fail-"));
    writeFile(
      tmp,
      ".github/workflows/a.yml",
      `name: t\njobs:\n  build:\n    runs-on: windows-latest\n    steps:\n      - run: echo hi\n`,
    );
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/missing Corepack pnpm bootstrap block/);
  });
});
