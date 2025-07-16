const child_process = require("child_process");

function fakeInstall(cmd) {
  if (cmd.includes("playwright install --with-deps --dry-run")) {
    return Buffer.from("Host system is missing dependencies");
  }
  return Buffer.from("");
}

child_process.execSync = (cmd) => fakeInstall(cmd);
child_process.spawnSync = (cmd, args = []) => ({
  status: 0,
  stdout: fakeInstall(`${cmd} ${args.join(" ")}`),
  stderr: "",
});
