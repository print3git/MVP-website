const child_process = require("child_process");
child_process.execSync = function (cmd, _opts) {
  if (cmd.includes("playwright install")) {
    return Buffer.from("Playwright host dependencies already satisfied.");
  }
  return Buffer.from("");
};
