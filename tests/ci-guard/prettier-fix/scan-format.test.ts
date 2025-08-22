import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const script = path.resolve(
  __dirname,
  "../../../scripts/ci-guard/prettier-fix/scan-format.ts",
);
const tsNode = [
  "-y",
  "ts-node",
  "--transpile-only",
  "--compiler-options",
  JSON.stringify({ module: "commonjs", moduleResolution: "node" }),
  script,
];

function run(cwd: string, args: string[] = []) {
  return spawnSync("npx", [...tsNode, cwd, ...args], { encoding: "utf8" });
}

function write(dir: string, file: string, content: string | Buffer) {
  const full = path.join(dir, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

describe("scan-format", () => {
  test("t1 formatted file passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-pass-"));
    write(tmp, "a.js", "const x = 1;\n");
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t2 extra spaces fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-fail-"));
    write(tmp, "a.js", "const x =  1;\n");
    const res = run(tmp);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/a.js\s+1/);
  });

  test("t3 mixed tabs and spaces in yaml fail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "yaml-fail-"));
    write(tmp, "a.yml", "a:\n\tb: 1\n");
    const res = run(tmp);
    expect(res.status).not.toBe(0);
  });

  test("t4 trailing comma pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "comma-pass-"));
    write(tmp, "a.js", "const o = {\n  a: 1,\n};\n");
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t5 trailing comma missing fails", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "comma-fail-"));
    write(tmp, "a.js", "const o = {\n  a: 1\n};\n");
    const res = run(tmp);
    expect(res.status).not.toBe(0);
  });

  test("t6 long line wrapped passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wrap-pass-"));
    const body = Array(20).fill("  { a: 1 },").join("\n");
    write(tmp, "a.js", `const arr = [\n${body}\n];\n`);
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t7 json spacing enforced", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "json-fail-"));
    write(tmp, "data.json", '{\n    "a": 1\n}\n');
    const res = run(tmp);
    expect(res.status).not.toBe(0);
  });

  test("t8 markdown fenced code block passes", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-pass-"));
    write(tmp, "readme.md", "# T\n\n```\ncode    with   spaces\n```\n");
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t9 prettierignore honored", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ignore-pass-"));
    write(tmp, ".prettierignore", "bad.js\n");
    write(tmp, "bad.js", "const  x = 1;\n");
    write(tmp, "good.js", "const x = 1;\n");
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t10 binary files ignored", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bin-pass-"));
    write(tmp, "bin.dat", Buffer.from([0, 1, 2, 3]));
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t11 windows line endings pass", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "crlf-pass-"));
    write(tmp, "a.js", "const x = 1;\r\n");
    const res = run(tmp);
    expect(res.status).toBe(0);
  });

  test("t12 editorconfig respected", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "editorconfig-fail-"));
    write(tmp, ".editorconfig", "[*.js]\nindent_size=4\n");
    write(tmp, "a.js", "function a() {\n  console.log(1);\n}\n");
    const res = run(tmp);
    expect(res.status).not.toBe(0);
  });

  test("t13 summary reports count and limit", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "summary-fail-"));
    write(tmp, "a.js", "const x =  1;\n");
    write(tmp, "b.js", "const x =  1;\n");
    write(tmp, "c.js", "const x =  1;\n");
    const res = run(tmp, ["--max", "2"]);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toMatch(/Found 3 files/);
    const lines = res.stderr
      .trim()
      .split(/\n/)
      .filter((l) => /\.js\s+1$/.test(l));
    expect(lines.length).toBe(2);
  });
});
