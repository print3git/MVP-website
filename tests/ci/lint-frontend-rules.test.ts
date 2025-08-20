import { spawnSync } from "child_process";
import path from "path";

test("frontend lint rules apply without errors", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const childScript = `
    const { ESLint } = require("eslint");
    const config = require(${JSON.stringify(path.join(repoRoot, "eslint.frontend-87adf32bca1e546.cjs"))});
    (async () => {
      const eslint = new ESLint({ overrideConfig: config, cwd: ${JSON.stringify(repoRoot)} });
      const code = ${JSON.stringify("import React from 'react';\nexport default function Button(){ return <button aria-label='ok' />; }\n")};
      const results = await eslint.lintText(code, { filePath: "sample.tsx" });
      process.stdout.write(JSON.stringify(results));
    })().catch(err => { console.error(err); process.exit(1); });
  `;
  const proc = spawnSync(
    process.execPath,
    ["--experimental-vm-modules", "--eval", childScript],
    { cwd: repoRoot, encoding: "utf8", env: { ...process.env, CI: "1" } },
  );
  if (proc.status !== 0) {
    console.error(proc.stderr);
  }
  expect(proc.status).toBe(0);
  const results = JSON.parse(proc.stdout || "[]");
  const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
  expect(errorCount).toBe(0);
});
