const child_process = require("child_process");
const origExecSync = child_process.execSync;
child_process.execSync = function (cmd, opts) {
  if (cmd.includes("validate-env")) {
    const err = new Error("validate-env failed");
    err.status = 1;
    throw err;
  }
  return origExecSync(cmd, opts);
};
