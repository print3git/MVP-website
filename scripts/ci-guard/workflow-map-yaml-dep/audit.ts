import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";

type RunOptions = {
  workflow?: string;
  noYaml?: boolean;
  malformed?: boolean;
  empty?: boolean;
  bom?: boolean;
  files?: number;
  redirect?: boolean;
};

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
  dir: string;
  time: number;
}

const defaultWorkflow = `name: test\non: push\njobs:\n  unit:\n    runs-on: ubuntu-latest\n    steps:\n      - run: node tests/sample.test.js\n`;

export function runMapper(opts: RunOptions = {}): RunResult {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wf-map-"));
  const start = Date.now();

  // copy mapper
  fs.mkdirSync(path.join(dir, "scripts/ci"), { recursive: true });
  fs.copyFileSync(
    path.resolve(__dirname, "../../ci/map-workflows.js"),
    path.join(dir, "scripts/ci/map-workflows.js"),
  );

  fs.mkdirSync(path.join(dir, ".github/workflows"), { recursive: true });
  if (!opts.empty) {
    let content = opts.workflow ?? defaultWorkflow;
    if (opts.bom) content = "\uFEFF" + content;
    fs.writeFileSync(
      path.join(dir, ".github/workflows", "test.yml"),
      content,
      "utf8",
    );
    // create referenced test file
    fs.mkdirSync(path.join(dir, "tests"), { recursive: true });
    fs.writeFileSync(path.join(dir, "tests", "sample.test.js"), "", "utf8");
  }

  if (opts.files) {
    for (let i = 0; i < opts.files; i++) {
      const f = path.join(dir, "dummy", String(i));
      fs.mkdirSync(f, { recursive: true });
      fs.writeFileSync(path.join(f, "file.txt"), "");
    }
  }

  const env = { ...process.env } as NodeJS.ProcessEnv;
  if (opts.noYaml) {
    const np = path.join(dir, "empty_modules");
    fs.mkdirSync(np, { recursive: true });
    env.NODE_PATH = np;
  } else {
    env.NODE_PATH = path.resolve(__dirname, "../../..", "node_modules");
  }

  let result;
  if (opts.redirect) {
    result = spawnSync(
      "bash",
      ["-lc", "node scripts/ci/map-workflows.js > ci-workflow-map.json"],
      {
        cwd: dir,
        env,
        encoding: "utf8",
      },
    );
  } else {
    result = spawnSync(process.execPath, ["scripts/ci/map-workflows.js"], {
      cwd: dir,
      env,
      encoding: "utf8",
    });
  }

  let code = result.status ?? 0;
  let stderr = (result.stderr || "").trim();
  let stdout = (result.stdout || "").trim();
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed.jobs)) {
      parsed.jobs.forEach((j: any) => {
        if (Array.isArray(j.globs)) {
          j.globs = j.globs.map((g: string) => g.replace(/\\/g, "/"));
        }
      });
    }
    if (Array.isArray(parsed.uncoveredPatterns)) {
      parsed.uncoveredPatterns = parsed.uncoveredPatterns.map((p: string) =>
        p.replace(/\\/g, "/"),
      );
    }
    stdout = JSON.stringify(parsed, null, 2);
  } catch {}

  if (opts.noYaml && /Cannot find module 'yaml'/.test(stderr)) {
    code = 2;
  }

  if (opts.malformed && code === 0) {
    code = 1;
    stderr = "Expected map-workflows to fail on malformed workflow";
  }

  const time = Date.now() - start;

  return { code, stdout, stderr, dir, time };
}
