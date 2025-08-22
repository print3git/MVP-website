import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { audit } from "../../scripts/ci/workflow-permissions-audit";

describe("permissions-audit", () => {
  const base = join(__dirname, "fixtures", "workflow-permissions-audit");

  it("fails when permissions missing", async () => {
    const dir = join(base, "missing");
    await expect(audit(dir)).resolves.toEqual(["workflow.yml"]);
  });

  it("passes when permissions present", async () => {
    const dir = join(base, "correct");
    await expect(audit(dir)).resolves.toEqual([]);
  });
});
