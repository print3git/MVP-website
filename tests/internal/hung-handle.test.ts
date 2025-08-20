import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

describe("hung handle watchdog", () => {
  const repoRoot = path.resolve(__dirname, "../..");

  const maybe = process.env.CI_ONLY === "1" ? test.skip : test;

  maybe("warns and exits when a handle is left open", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leak-"));
    const testFile = path.join(tmpDir, "leak.test.js");
    fs.writeFileSync(
      testFile,
      "setInterval(() => {}, 1000);\n" +
        "test('leaks', () => { expect(true).toBe(true); });\n",
    );

    const result = spawnSync("node", ["scripts/run-jest.js", testFile], {
      cwd: repoRoot,
      timeout: 5000,
      encoding: "utf8",
      env: {
        ...process.env,
        SKIP_PW_DEPS: "1",
        SKIP_NET_CHECKS: "1",
        SKIP_DB_CHECK: "1",
      },
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });

    expect(result.error).toBeDefined();
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toMatch(
      /Jest did not exit one second after the test run has completed./i,
    );
  });
});
