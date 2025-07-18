import { spawnSync } from "child_process";

test("npm ci succeeds with no missing deps", () => {
  const res = spawnSync("npm", ["ci", "--ignore-scripts"], {
    encoding: "utf8",
  });
  const output = `${res.stdout || ""}${res.stderr || ""}`;
  expect(res.status).toBe(0);
  expect(output).not.toMatch(/missing dependencies/i);
});
