const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  runAudit,
} = require("../../../scripts/ci-guard/required-workflows/audit.ts");

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wf-audit-"));
}

function writeYaml(file) {
  fs.writeFileSync(file, "on: push\njobs: {}\n");
}

describe("required workflows audit", () => {
  test("all files present pass", async () => {
    const dir = tempDir();
    const a = path.join(dir, "a.yml");
    const b = path.join(dir, "b.yml");
    writeYaml(a);
    writeYaml(b);
    const list = [
      { path: "a.yml", root: dir, mode: "fail" },
      { path: "b.yml", root: dir },
    ];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("one missing warn", async () => {
    const dir = tempDir();
    const a = path.join(dir, "a.yml");
    writeYaml(a);
    const list = [
      { path: "a.yml", root: dir, mode: "fail" },
      { path: "b.yml", root: dir, mode: "warn" },
    ];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("one missing fail", async () => {
    const dir = tempDir();
    const list = [{ path: "a.yml", root: dir, mode: "fail" }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("stub schema valid", async () => {
    const dir = tempDir();
    const a = path.join(dir, "a.yml");
    writeYaml(a);
    const list = [{ path: "a.yml", root: dir }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("malformed yaml fails with filename", async () => {
    const dir = tempDir();
    const bad = path.join(dir, "bad.yml");
    fs.writeFileSync(bad, ":::\n");
    const list = [{ path: "bad.yml", root: dir, mode: "fail" }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors[0]).toContain("bad.yml");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("extra stubs ignored", async () => {
    const dir = tempDir();
    const a = path.join(dir, "a.yml");
    const extra = path.join(dir, "extra.yml");
    writeYaml(a);
    writeYaml(extra);
    const list = [{ path: "a.yml", root: dir }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("empty list passes", async () => {
    const dir = tempDir();
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, "[]");
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("missing list defaults to pass", async () => {
    const dir = tempDir();
    const listPath = path.join(dir, "missing.json");
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    expect(res.warnings).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("workflow_dispatch only warns", async () => {
    const dir = tempDir();
    const wf = path.join(dir, "a.yml");
    fs.writeFileSync(wf, "on: workflow_dispatch\njobs: {}\n");
    const list = [{ path: "a.yml", root: dir }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.warnings[0]).toMatch(/workflow_dispatch/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("writes summary file", async () => {
    const dir = tempDir();
    const wf = path.join(dir, "a.yml");
    writeYaml(wf);
    const list = [{ path: "a.yml", root: dir }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const summaryFile = path.join(dir, "out.md");
    await runAudit({ listPath, summaryFile });
    expect(fs.readFileSync(summaryFile, "utf8")).toContain(
      "Required workflows audit",
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("mode matrix warn and fail", async () => {
    const dir = tempDir();
    const list = [
      { path: "a.yml", root: dir, mode: "warn" },
      { path: "b.yml", root: dir, mode: "fail" },
    ];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.warnings).toHaveLength(1);
    expect(res.errors).toHaveLength(1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("handles custom root", async () => {
    const dir = tempDir();
    const sub = path.join(dir, "repoB");
    fs.mkdirSync(sub);
    const wf = path.join(sub, "wf.yml");
    writeYaml(wf);
    const list = [{ path: "wf.yml", root: sub }];
    const listPath = path.join(dir, "list.json");
    fs.writeFileSync(listPath, JSON.stringify(list));
    const res = await runAudit({ listPath });
    expect(res.errors).toHaveLength(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
