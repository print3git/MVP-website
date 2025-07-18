const { execSync } = require("child_process");

test("scripts compile", () => {
  execSync("npx tsc -p scripts/tsconfig.json", { stdio: "inherit" });
});
