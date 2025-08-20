import { spawnSync } from "child_process";
import path from "path";

test("ESLint runs in isolation", () => {
  const repoRoot = path.join(__dirname, "..", "..");
  const childScript = `
    const { ESLint } = require("eslint");
    const config = require(${JSON.stringify(path.join(repoRoot, "eslint.config.js"))});
    (async () => {
      const eslint = new ESLint({
        overrideConfig: config,
        cwd: ${JSON.stringify(repoRoot)},
      });
      const results = await eslint.lintFiles([
        "scripts/auto-cloudflare-config.ts",
        "e2e/frontendGlbRequest.test.tsx",
      ]);
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
  const fatalCount = results.reduce((sum, r) => sum + r.fatalErrorCount, 0);
  expect(fatalCount).toBe(0);
});
