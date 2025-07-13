const fs = require("fs");

test("commit-msg runs setup before commitlint", () => {
  const script = fs.readFileSync(".husky/commit-msg", "utf8");
  const lines = script.split(/\r?\n/).filter(Boolean);
  const idxSetup = lines.findIndex((l) => l.includes("assert-setup.js"));
  const idxLint = lines.findIndex((l) => l.includes("commitlint"));
  expect(idxSetup).toBeGreaterThan(-1);
  expect(idxLint).toBeGreaterThan(-1);
  expect(idxSetup).toBeLessThan(idxLint);
});
