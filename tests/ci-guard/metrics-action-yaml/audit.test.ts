import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";
import yaml from "yaml";

function writeTemp(content: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-"));
  const file = path.join(dir, "action.yml");
  fs.writeFileSync(file, content, "utf8");
  return file;
}

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const validPath = path.join(
  repoRoot,
  ".github/actions/ci-metrics-emit/action.yml",
);
const auditPath = path.join(
  repoRoot,
  "scripts/ci-guard/metrics-action-yaml/audit.ts",
);
const validObj = yaml
  .parseDocument(fs.readFileSync(validPath, "utf8"))
  .toJSON();

function runAudit(target: string) {
  try {
    execSync(`node ${auditPath} ${target}`, { stdio: "pipe" });
    return { ok: true, stderr: "" };
  } catch (e: any) {
    return { ok: false, stderr: e.stderr.toString() };
  }
}

describe("metrics action audit", () => {
  test("t1 valid manifest passes", () => {
    expect(runAudit(validPath).ok).toBe(true);
  });

  test("t2 missing colon in step fails with path+line", () => {
    const bad = path.join(__dirname, "fixtures", "missing-colon.yml");
    const res = runAudit(bad);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(new RegExp(`${bad}:`));
  });

  test("t3 runs.using not composite fails", () => {
    const obj = { ...validObj, runs: { ...validObj.runs, using: "node12" } };
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(new RegExp(`${file}:\\d+:\\d+`));
    expect(res.stderr).toMatch(/runs\.using/);
  });

  test("t4 step has both uses and run fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.runs.steps[0].uses = "actions/checkout@v4";
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(new RegExp(`${file}:\\d+:\\d+`));
    expect(res.stderr).toMatch(/both uses and run/);
  });

  test("t5 step has run but no shell fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    delete obj.runs.steps[0].shell;
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(new RegExp(`${file}:\\d+:\\d+`));
    expect(res.stderr).toMatch(/missing shell/);
  });

  test("t6 timings required missing or false fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.inputs.timings.required = false;
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/inputs\.timings\.required/);
  });

  test("t7 inventory default wrong type fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.inputs.inventory.default = 1;
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/inventory\.default must be string/);
  });

  test("t8 tabs detected", () => {
    const content = fs
      .readFileSync(validPath, "utf8")
      .replace(/name:/, "\tname:");
    const file = writeTemp(content);
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/Tabs detected/);
  });

  test("t9 CRLF line endings detected", () => {
    const content = fs.readFileSync(validPath, "utf8").replace(/\n/g, "\r\n");
    const file = writeTemp(content);
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/CRLF/);
  });

  test("t10 duplicate keys at top level fails", () => {
    const dup =
      [
        "name: a",
        "name: b",
        "description: c",
        "runs:",
        "  using: composite",
        "  steps:",
        "    - run: echo hi",
        "      shell: bash",
        "inputs:",
        "  timings:",
        "    required: true",
        "  inventory:",
        "    default: foo",
      ].join("\n") + "\n";
    const file = writeTemp(dup);
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/Map keys must be unique/);
  });

  test("t11 empty steps array fails", () => {
    const obj = {
      ...validObj,
      runs: { using: "composite", steps: [] },
      inputs: validObj.inputs,
    };
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/steps must be non-empty/);
  });

  test("t12 file not found fails", () => {
    const missing = path.join(os.tmpdir(), "nope.yml");
    const res = runAudit(missing);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/File not found/);
  });

  test("t13 multiple script steps fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.runs.steps.push({ run: "echo hi", shell: "bash" });
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/exactly one script step/);
  });

  test("t14 script shell not bash fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.runs.steps[0].shell = "sh";
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/shell must be bash/);
  });

  test("t15 missing upload-artifact step fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.runs.steps = obj.runs.steps.filter(
      (s: any) => !(s.uses && s.uses.startsWith("actions/upload-artifact@")),
    );
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/missing upload-artifact step/);
  });

  test("t16 upload-artifact path wrong fails", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    const up = obj.runs.steps.find(
      (s: any) => s.uses && s.uses.startsWith("actions/upload-artifact@"),
    );
    up.with.path = "ci/metrics/bad.ndjson";
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(false);
    expect(res.stderr).toMatch(/upload-artifact path/);
  });

  test("t17 extra top-level key passes", () => {
    const obj = JSON.parse(JSON.stringify(validObj));
    obj.branding = { color: "blue", icon: "smile" };
    const file = writeTemp(yaml.stringify(obj));
    const res = runAudit(file);
    expect(res.ok).toBe(true);
  });
});
