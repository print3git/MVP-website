const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

test("server.js passes eslint", () => {
  const serverFile = path.join(__dirname, "..", "server.js");
  // Ensure the file exists to prevent path errors from masking lint failures
  expect(fs.existsSync(serverFile)).toBe(true);
  expect(() => {
    execSync(`npx eslint ${serverFile}`, { stdio: "pipe" });
  }).not.toThrow();
});
