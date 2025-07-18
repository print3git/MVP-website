import fs from "fs";
import { spawnSync } from "child_process";

test("package-lock.json matches package.json", () => {
  const before = fs.readFileSync("package-lock.json", "utf8");
  const res = spawnSync(
    "npm",
    ["install", "--package-lock-only", "--ignore-scripts"],
    {
      encoding: "utf8",
    },
  );
  expect(res.status).toBe(0);
  const after = fs.readFileSync("package-lock.json", "utf8");
  if (after !== before) {
    // restore original lockfile to avoid git diff
    fs.writeFileSync("package-lock.json", before);
  }
  expect(after).toBe(before);
});
