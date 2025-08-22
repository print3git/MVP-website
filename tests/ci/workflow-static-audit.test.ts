import path from "path";
import { describe, it, expect } from "vitest";
import { auditFiles } from "../../scripts/ci/workflow-static-audit";

const base = path.join(__dirname, "fixtures", "workflow-static-audit");
const allowed = path.join(base, "allowed-labels.yml");
const p = (f: string) => path.join(base, f);

describe("workflow-static-audit", () => {
  it("passes on a valid workflow", async () => {
    await expect(
      auditFiles([p("valid.yml")], { allowedLabelsFile: allowed }),
    ).resolves.toBeUndefined();
  });

  it("fails on nested runs-on", async () => {
    await expect(
      auditFiles([p("nested-runs-on.yml")], { allowedLabelsFile: allowed }),
    ).rejects.toThrow(/nested runs-on/);
  });

  it("fails when uses job contains disallowed keys", async () => {
    await expect(
      auditFiles([p("uses-disallowed.yml")], { allowedLabelsFile: allowed }),
    ).rejects.toThrow(/must not include 'runs-on'/);
  });

  it("fails on invalid timeout expression", async () => {
    await expect(
      auditFiles([p("timeout-invalid.yml")], { allowedLabelsFile: allowed }),
    ).rejects.toThrow(/timeout-minutes/);
  });

  it("allows numeric timeout expression", async () => {
    await expect(
      auditFiles([p("timeout-numeric.yml")], { allowedLabelsFile: allowed }),
    ).resolves.toBeUndefined();
  });

  it("allows fromJSON timeout expression", async () => {
    await expect(
      auditFiles([p("timeout-fromjson.yml")], { allowedLabelsFile: allowed }),
    ).resolves.toBeUndefined();
  });

  it("fails on unknown label", async () => {
    await expect(
      auditFiles([p("unknown-label.yml")], { allowedLabelsFile: allowed }),
    ).rejects.toThrow(/unknown label/);
  });

  it("fails on non-yaml content", async () => {
    await expect(
      auditFiles([p("non-yaml.yml")], { allowedLabelsFile: allowed }),
    ).rejects.toThrow();
  });
});
