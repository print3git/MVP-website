import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

test("detects dangling symlinks but ignores valid and circular ones", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "symlink-test-"));
  fs.writeFileSync(path.join(tmp, "file.txt"), "ok");
  fs.symlinkSync("file.txt", path.join(tmp, "valid-link"));
  fs.symlinkSync("missing.txt", path.join(tmp, "dangling-link"));
  fs.mkdirSync(path.join(tmp, "cycle"));
  fs.symlinkSync("../cycle", path.join(tmp, "cycle", "self")); // circular

  let error;
  try {
    execSync(
      `TS_NODE_TRANSPILE_ONLY=1 npx ts-node scripts/check-broken-symlinks-9ac8f74db5e1c32.ts ${tmp}`,
      { encoding: "utf8", stdio: "pipe" },
    );
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  const output = (error.stdout || "") + (error.stderr || "");
  expect(output).toMatch(/broken symlink/);
  expect(output).not.toMatch(/valid-link/);
});
