import { execFileSync } from "child_process";
import { expect, test } from "@jest/globals";
import path from "path";

// Ensure ESLint can parse TypeScript files without errors.
test("eslint parses TypeScript", () => {
  const script = path.join(__dirname, "helpers", "run-eslint-via-execa.mjs");
  const output = execFileSync("node", [script], { encoding: "utf8" });
  expect(output).toBe("");
});
