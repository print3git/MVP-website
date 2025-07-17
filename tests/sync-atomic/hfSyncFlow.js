const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function syncFlow(repoDir, destDir, opts = {}) {
  const token = process.env.HF_TOKEN || process.env.HF_API_KEY;
  if (!token) throw new Error("HF_TOKEN or HF_API_KEY must be set");

  const sshUrl = opts.sshUrl;
  const httpsUrl = opts.httpsUrl || repoDir;
  const lfsTimeout = opts.lfsTimeout || 5000;
  const rsyncRetries = opts.rsyncRetries || 1;

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  let cloneResult;
  if (sshUrl) {
    cloneResult = spawnSync("git", ["clone", sshUrl, destDir]);
    if (cloneResult.status !== 0) {
      cloneResult = spawnSync("git", ["clone", httpsUrl, destDir]);
    }
  } else {
    cloneResult = spawnSync("git", ["clone", httpsUrl, destDir]);
  }
  if (cloneResult.status !== 0) {
    return cloneResult.status || 1;
  }

  const lfsResult = spawnSync("git", ["lfs", "pull"], {
    cwd: destDir,
    timeout: lfsTimeout,
  });
  if (lfsResult.status !== 0) {
    return lfsResult.status === null ? 124 : lfsResult.status;
  }

  let attempt = 0;
  let rsyncResult;
  do {
    rsyncResult = spawnSync("rsync", [
      "-a",
      "--delete",
      repoDir + "/",
      destDir + "/",
    ]);
    attempt += 1;
  } while (rsyncResult.status === 255 && attempt < rsyncRetries);

  if (rsyncResult.status !== 0) {
    return rsyncResult.status || 1;
  }

  const srcReadme = path.join(repoDir, "README.md");
  if (fs.existsSync(srcReadme)) {
    fs.copyFileSync(srcReadme, path.join(destDir, "README.md"));
  }

  return 0;
}

module.exports = { syncFlow };
