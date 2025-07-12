const fs = require("fs");

test("pre-commit validates env before lint-staged", () => {
  const script = fs.readFileSync(".husky/pre-commit", "utf8");
  const lines = script.split(/\r?\n/).filter(Boolean);
  const idxValidate = lines.findIndex((l) =>
    l.includes("npm run validate-env"),
  );
  const idxLint = lines.findIndex((l) => l.includes("npx lint-staged"));
  expect(idxValidate).toBeGreaterThan(-1);
  expect(idxLint).toBeGreaterThan(-1);
  expect(idxValidate).toBeLessThan(idxLint);
});
