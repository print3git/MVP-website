const { execFileSync } = require("child_process");

describe("scripts TypeScript compilation", () => {
  test("tsconfig compiles without errors", () => {
    execFileSync("npx", ["tsc", "-p", "scripts/tsconfig.json"], {
      stdio: "inherit",
    });
  });
});
