const { execFileSync } = require("child_process");
const path = require("path");

describe("lint regression guard", () => {
  test("eslint footprint does not grow", () => {
    const script = path.join(
      __dirname,
      "..",
      "scripts",
      "check-lint-regression.js",
    );
    execFileSync("node", [script], { stdio: "inherit" });
  });
});
