import { mkdtempSync, rmSync, cpSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";

test("npm ci --ignore-scripts succeeds in clean env", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "npm-ci-test-"));
  try {
    cpSync("package.json", path.join(tmp, "package.json"));
    cpSync("package-lock.json", path.join(tmp, "package-lock.json"));
    const res = spawnSync("npm", ["ci", "--ignore-scripts"], {
      cwd: tmp,
      encoding: "utf8",
    });
    const output = `${res.stdout || ""}${res.stderr || ""}`;
    expect(res.status).toBe(0);
    expect(output).not.toMatch(/missing dependencies/i);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
