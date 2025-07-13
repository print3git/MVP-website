const { execFileSync } = require("child_process");
const path = require("path");

describe("process.env usage", () => {
  test("does not increase beyond baseline", () => {
    const script = path.join(
      __dirname,
      "..",
      "scripts",
      "check-process-env.js",
    );
    execFileSync("node", [script], { stdio: "inherit" });
  });
});
