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

function writePkg(dir: string, ver = "10.11.0") {
  writeFile(dir, "package.json", `{"name":"t","packageManager":"pnpm@${ver}"}`);
  writeFile(dir, "pnpm-lock.yaml", "");
}

interface WfOpts {
  runsOn: string;
  steps: string[];
  strategy?: string[];
  jobName?: string;
}

function wf({ runsOn, steps, strategy, jobName = "build" }: WfOpts): string {
  const lines = [
    "name: t",
    "jobs:",
    `  ${jobName}:`,
    `    runs-on: ${runsOn}`,
  ];
  if (strategy) {
    for (const l of strategy) lines.push(`    ${l}`);
  }
  lines.push("    steps:");
  for (const step of steps) {
    for (const l of step.split("\n")) lines.push(`      ${l}`);
  }
  return lines.join("\n") + "\n";
}

describe("corepack pnpm windows audit", () => {
  test("t1 windows job with full bootstrap passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t1-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t2 missing corepack enable fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t2-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/missing corepack enable/);
  });

  test("t3 missing prepare and fallback fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t3-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/missing corepack prepare or pnpm\/action-setup/);
  });

  test("t4 pnpm used before verify fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t4-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- run: pnpm install",
        "- run: pnpm -v",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/pnpm used before verification/);
  });

  test("t5 cache npm fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t5-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: npm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/cache:npm/);
  });

  test("t6 conflicting pinned version fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t6-"));
    writePkg(tmp, "10.11.0");
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@9 --activate",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/workflow pins pnpm@9/);
  });

  test("t7 non-windows job ignored", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t7-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "ubuntu-latest",
      steps: ["- run: pnpm install"],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t8 multiple lockfiles pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t8-"));
    writePkg(tmp);
    writeFile(tmp, "frontend/pnpm-lock.yaml", "");
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm\n    cache-dependency-path: |\n      pnpm-lock.yaml\n      frontend/pnpm-lock.yaml",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t9 matrix with windows validated", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t9-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "${{ matrix.os }}",
      strategy: [
        "strategy:",
        "  fail-fast: false",
        "  matrix:",
        "    os: [windows-latest, ubuntu-latest]",
      ],
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- if: startsWith(runner.os, 'Windows')\n  shell: pwsh\n  run: corepack enable",
        "- if: startsWith(runner.os, 'Windows')\n  shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- if: startsWith(runner.os, 'Windows')\n  shell: pwsh\n  run: pnpm -v",
        "- if: startsWith(runner.os, 'Windows')\n  run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t10 verify shell bash accepted", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t10-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- shell: bash\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t11 job name irrelevant", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t11-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      jobName: "funky-job-name",
      steps: [
        "- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: pnpm",
        "- shell: pwsh\n  run: corepack enable",
        "- shell: pwsh\n  run: corepack prepare pnpm@10.11.0 --activate",
        "- shell: pwsh\n  run: pnpm -v",
        "- run: pnpm install",
      ],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t12 aggregated errors reported", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpw-t12-"));
    writePkg(tmp);
    const content = wf({
      runsOn: "windows-latest",
      jobName: "bad",
      steps: ["- run: pnpm install"],
    });
    writeFile(tmp, ".github/workflows/a.yml", content);
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr + res.stdout).toMatch(/a.yml > bad/);
    expect(res.stderr + res.stdout).toMatch(/missing actions\/setup-node@v4/);
    expect(res.stderr + res.stdout).toMatch(/missing corepack enable/);
  });
});

