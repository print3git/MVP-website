const { execSync } = require("child_process");

test("repository passes ESLint with no warnings", () => {
  try {
    // run lint (remove --silent so we get full output)
    execSync("npm run lint", { stdio: "pipe", encoding: "utf-8" });
  } catch (error) {
    // print both stdout and stderr from ESLint
    console.error("\n⛔ ESLint found problems:\n");
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    // re‑throw to fail the test
    throw error;
  }
});
