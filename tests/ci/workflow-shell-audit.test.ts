import { describe, expect, test } from "vitest";
import {
  auditWorkflow,
  auditAllWorkflows,
} from "../../scripts/ci/workflow-shell-audit";

describe("workflow shell audit", () => {
  test("shell-audit valid examples", () => {
    const text = [
      "steps:",
      "  - run: echo hi",
      "    shell: bash",
      "  - run: echo hi",
      "    shell: bash -e {0}",
      "  - run: echo hi",
      "    shell: pwsh",
    ].join("\n");
    expect(auditWorkflow(text, "test.yml")).toEqual([]);
  });

  test("shell-audit invalid shell", () => {
    const text = [
      "steps:",
      "  - shell: /usr/bin/bash -euo pipefail",
      "    run: echo hi",
    ].join("\n");
    expect(auditWorkflow(text, "test.yml")).toEqual([
      { file: "test.yml", line: 2, shell: "/usr/bin/bash -euo pipefail" },
    ]);
  });

  test("shell-audit real workflows snapshot", () => {
    expect(auditAllWorkflows()).toMatchInlineSnapshot("[]");
  });
});
