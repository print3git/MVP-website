// scripts/run-jest.js
const fs = require("fs");
const child_process = require("child_process");
const path = require("path");

function runJest(args = []) {
  // projectRoot = <repo>/scripts/..
  const projectRoot = path.resolve(__dirname, "..");
  const jestBin = path.join(
    projectRoot,
    "backend",
    "node_modules",
    ".bin",
    "jest"
  );

  // always run inside the backend folder
  const options = {
    cwd: path.join(projectRoot, "backend"),
    encoding: "utf8",
    env: process.env,
    stdio: "inherit",
  };

  if (fs.existsSync(jestBin)) {
    // use the locally-installed jest
    child_process.spawnSync(jestBin, args, options);
  } else {
    // fallback to `npm test`
    child_process.spawnSync(
      "npm",
      ["test", "--prefix", "backend"],
      options
    );
  }
}

module.exports = runJest;
