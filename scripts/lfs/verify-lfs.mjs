import { execSync } from "node:child_process";
import fs from "node:fs";
function sh(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString().trim();
}
try {
  sh("git lfs version");
} catch {
  console.error("Git LFS not installed in this environment");
  process.exit(2);
}
const ls = sh("git lfs ls-files || true");
if (!ls) {
  console.error("No files tracked by Git LFS");
  process.exit(3);
}
// basic pointer check for any tracked snapshot/model
const candidates = ls
  .split("\n")
  .map((l) => l.split(" ").pop())
  .filter(Boolean);
const bad = candidates.filter((p) => {
  try {
    const b = fs.readFileSync(p, "utf8");
    return !b.startsWith("version https://git-lfs.github.com/spec");
  } catch {
    return true;
  }
});
if (bad.length) {
  console.error("These files are not LFS pointers:", bad);
  process.exit(4);
}
console.log("Git LFS OK: tracked files present and pointers valid.");
