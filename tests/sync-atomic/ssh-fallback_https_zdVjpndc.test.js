const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("SSH clone fails then HTTPS succeeds", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "hello");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  child_process.spawnSync
    .mockReturnValueOnce({ status: 1 }) // ssh clone fails
    .mockReturnValueOnce({ status: 0 }) // https clone
    .mockReturnValueOnce({ status: 0 }) // git lfs pull
    .mockReturnValueOnce({ status: 0 }); // rsync
  const code = syncFlow(repo, dest, { sshUrl: "git@server:repo.git" });
  expect(code).toBe(0);
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(1, "git", [
    "clone",
    "git@server:repo.git",
    dest,
  ]);
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(2, "git", [
    "clone",
    repo,
    dest,
  ]);
  delete process.env.HF_TOKEN;
});
