import path from "path";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  analyzeWorkflows,
} = require("../../scripts/ci-guards/analyze-github-script");

const fixtures = (name: string) => path.join(__dirname, "fixtures", name);

describe("github-script analyzer", () => {
  test("good usage baseline", () => {
    const findings = analyzeWorkflows([fixtures("good.yml")]);
    expect(findings).toEqual([]);
  });

  test("FORBIDDEN_REQUIRES flagged", () => {
    const findings = analyzeWorkflows([fixtures("forbidden-requires.yml")]);
    expect(findings.some((f) => f.rule === "FORBIDDEN_REQUIRES")).toBe(true);
  });

  test("SHADOWED_GLOBALS flagged", () => {
    const findings = analyzeWorkflows([fixtures("shadowed-globals.yml")]);
    expect(findings.some((f) => f.rule === "SHADOWED_GLOBALS")).toBe(true);
  });

  test("INVALID_CONTEXT flagged", () => {
    const findings = analyzeWorkflows([fixtures("invalid-context.yml")]);
    expect(findings.some((f) => f.rule === "INVALID_CONTEXT")).toBe(true);
  });

  test("RAW_OCTOKIT flagged", () => {
    const findings = analyzeWorkflows([fixtures("raw-octokit.yml")]);
    expect(findings.some((f) => f.rule === "RAW_OCTOKIT")).toBe(true);
  });

  test("MISSING_PERMISSIONS flagged", () => {
    const findings = analyzeWorkflows([fixtures("missing-permissions.yml")]);
    expect(findings.some((f) => f.rule === "MISSING_PERMISSIONS")).toBe(true);
  });

  test("NO_TRY_CATCH flagged", () => {
    const findings = analyzeWorkflows([fixtures("no-try-catch.yml")]);
    expect(findings.some((f) => f.rule === "NO_TRY_CATCH")).toBe(true);
  });

  test("NO_AWAIT_PAGINATION flagged", () => {
    const findings = analyzeWorkflows([fixtures("no-await-pagination.yml")]);
    expect(findings.some((f) => f.rule === "NO_AWAIT_PAGINATION")).toBe(true);
  });

  test("HARDCODED_OWNER_REPO flagged", () => {
    const findings = analyzeWorkflows([fixtures("hardcoded-owner-repo.yml")]);
    expect(findings.some((f) => f.rule === "HARDCODED_OWNER_REPO")).toBe(true);
  });

  test("SIDE_EFFECT_SECRETS flagged", () => {
    const findings = analyzeWorkflows([fixtures("side-effect-secrets.yml")]);
    expect(findings.some((f) => f.rule === "SIDE_EFFECT_SECRETS")).toBe(true);
  });

  test("EMPTY_SCRIPT flagged", () => {
    const findings = analyzeWorkflows([fixtures("empty-script.yml")]);
    expect(findings.some((f) => f.rule === "EMPTY_SCRIPT")).toBe(true);
  });
});
