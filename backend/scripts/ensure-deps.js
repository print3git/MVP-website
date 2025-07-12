const fs = require("fs");
const { execSync } = require("child_process");

const jestPath = "node_modules/.bin/jest";

if (!fs.existsSync(jestPath)) {
  console.log("Jest not found. Installing backend dependencies...");
  try {
    execSync("npm ping", { stdio: "ignore" });
  } catch {
    console.error(
      "Unable to reach the npm registry. Check network connectivity or proxy settings.",
    );
    process.exit(1);
  }
  execSync("npm ci", { stdio: "inherit" });
}
