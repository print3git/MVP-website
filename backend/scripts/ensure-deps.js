const fs = require("fs");
const { execSync } = require("child_process");

const jestPath = "node_modules/.bin/jest";

if (!fs.existsSync(jestPath)) {
  console.log("Jest not found. Installing backend dependencies...");
  execSync("npm ci", { stdio: "inherit" });
}
