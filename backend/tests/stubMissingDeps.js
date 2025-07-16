const child_process = require("child_process");
child_process.execSync = function (cmd) {
  if (cmd.includes("playwright install --with-deps --dry-run")) {
    return Buffer.from("Host system is missing dependencies");
  }
  return Buffer.from("");
};

child_process.spawnSync = function (cmd, args = []) {
  const joined = [cmd, ...(args || [])].join(" ");
  if (joined.includes("playwright install --with-deps --dry-run")) {
    return {
      status: 0,
      stdout: "Host system is missing dependencies",
      stderr: "",
    };
  }
  return { status: 0, stdout: "", stderr: "" };
};
