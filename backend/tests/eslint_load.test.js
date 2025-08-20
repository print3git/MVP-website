const { execSync } = require("child_process");

test("eslint config loads", () => {
  const out = execSync(
    "node -e \"require('eslint'); console.log('eslint ok')\"",
    {
      encoding: "utf8",
      cwd: __dirname + "/..",
    },
  );
  expect(out.trim()).toBe("eslint ok");
});
