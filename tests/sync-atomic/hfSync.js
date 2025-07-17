const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const err = new Error(`${cmd} failed`);
    err.status = res.status;
    throw err;
  }
}

function sync({ repo, dest, hfToken, useSSH = false, lfsTimeout = 10000 }) {
  if (!hfToken) {
    const err = new Error("HF_TOKEN missing");
    err.code = "NOAUTH";
    throw err;
  }
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  const sshUrl = `git@huggingface.co:${repo}.git`;
  const httpsUrl = `https://huggingface.co/${repo}.git`;
  let url = useSSH ? sshUrl : httpsUrl;
  try {
    run("git", ["clone", url, dest]);
  } catch (err) {
    if (useSSH) {
      run("git", ["clone", httpsUrl, dest]);
    } else {
      throw err;
    }
  }
  run("git", ["lfs", "pull"], { cwd: dest, timeout: lfsTimeout });
  const outDir = path.join("public", "models");
  fs.mkdirSync(outDir, { recursive: true });
  try {
    run("rsync", ["-a", dest + "/", outDir]);
  } catch (err) {
    if (err.status === 255) {
      // retry once
      run("rsync", ["-a", dest + "/", outDir]);
    } else {
      throw err;
    }
  }
}

module.exports = { sync };
