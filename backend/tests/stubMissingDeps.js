const child_process = require("child_process");
child_process.execSync = function (cmd) {
  if (cmd.includes("playwright install --with-deps --dry-run")) {
    return Buffer.from("Host system is missing dependencies");
  }
  return Buffer.from("");
};
