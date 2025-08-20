const fs = require("fs");

test("pre-commit validates env before lint-staged", () => {
  const script = fs.readFileSync(".husky/pre-commit", "utf8");
  const lines = script.split(/\r?\n/).filter(Boolean);
  const idxValidate = lines.findIndex((l) =>
    l.includes("npm run validate-env"),
  );
  const idxLint = lines.findIndex((l) => l.includes("npx lint-staged"));
  const idxEslint = lines.findIndex((l) =>
    l.includes("npx eslint . --ext .ts,.tsx,.js --max-warnings=0"),
  );
  const idxTsc = lines.findIndex((l) => l.includes("npx tsc --noEmit"));
  expect(idxValidate).toBeGreaterThan(-1);
  expect(idxLint).toBeGreaterThan(-1);
  expect(idxEslint).toBeGreaterThan(-1);
  expect(idxTsc).toBeGreaterThan(-1);
  expect(idxValidate).toBeLessThan(idxLint);
  expect(idxLint).toBeLessThan(idxEslint);
  expect(idxEslint).toBeLessThan(idxTsc);
});
