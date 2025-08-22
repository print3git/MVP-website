import { audit } from "../../../scripts/ci-guard/secret-sentinel/audit";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("secret-sentinel audit", () => {
  test("space-separated names, all present -> exit 0", () => {
    const res = audit("FOO BAR", { FOO: "x", BAR: "y" });
    expect(res.code).toBe(0);
    expect(res.stdout).toBe("");
  });

  test("newline-separated names, one missing -> exit 1, name listed", () => {
    const res = audit("FOO\nBAR", { FOO: "x" });
    expect(res.code).toBe(1);
    expect(res.stdout).toBe("BAR");
  });

  test("comma-separated names supported", () => {
    let res = audit("FOO,BAR", { FOO: "1", BAR: "2" });
    expect(res.code).toBe(0);
    res = audit("FOO,BAR", { FOO: "1" });
    expect(res.code).toBe(1);
    expect(res.stdout).toBe("BAR");
  });

  test("mixed whitespace & commas parse correctly", () => {
    const res = audit("FOO, BAR\nBAZ", { FOO: "a", BAR: "b", BAZ: "c" });
    expect(res.code).toBe(0);
  });

  test("empty VARS_RAW -> exit 0", () => {
    const res = audit("", {});
    expect(res.code).toBe(0);
  });

  test("duplicate names de-duplicated; single report", () => {
    const res = audit("FOO FOO BAR", { BAR: "1" });
    expect(res.code).toBe(1);
    expect(res.stdout).toBe("FOO");
  });

  test("names with stray commas/spaces trimmed and handled", () => {
    const res = audit(" FOO , , BAR ", { BAR: "1" });
    expect(res.code).toBe(1);
    expect(res.stdout).toBe("FOO");
  });

  test("very long list (50+) still fast and correct", () => {
    const names = Array.from({ length: 60 }, (_, i) => `VAR${i}`);
    const env: Record<string, string> = {};
    names.slice(0, -1).forEach((n) => {
      env[n] = "1";
    });
    const res = audit(names.join(" "), env);
    expect(res.code).toBe(1);
    expect(res.stdout).toBe(names[names.length - 1]);
  });

  test("env contains empty string -> treated as missing", () => {
    const res = audit("FOO BAR", { FOO: "", BAR: "1" });
    expect(res.code).toBe(1);
    expect(res.stdout).toBe("FOO");
  });

  test("non-ASCII env var values handled", () => {
    const res = audit("UNICODE", { UNICODE: "déjà" });
    expect(res.code).toBe(0);
  });

  test("composite action variant resolves inputs.vars", () => {
    const res = audit(
      "FOO BAR",
      { FOO: "1", BAR: "2" },
      { useInputVars: true },
    );
    expect(res.code).toBe(0);
  });

  test("summary output written on failure", () => {
    const tmp = mkdtempSync(join(tmpdir(), "summary-"));
    const file = join(tmp, "out.md");
    const res = audit("FOO", {}, { summaryFile: file });
    expect(res.code).toBe(1);
    expect(readFileSync(file, "utf8").trim()).toBe("FOO");
  });
});
