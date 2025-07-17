const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("LFS clone succeeds", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "hello");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  child_process.spawnSync
    .mockReturnValueOnce({ status: 0 }) // git clone
    .mockReturnValueOnce({ status: 0 }) // git lfs pull
    .mockReturnValueOnce({ status: 0 }); // rsync
  const code = syncFlow(repo, dest);
  expect(code).toBe(0);
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(1, "git", [
    "clone",
    repo,
    dest,
  ]);
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(
    2,
    "git",
    ["lfs", "pull"],
    { cwd: dest, timeout: 5000 },
  );
  expect(child_process.spawnSync).toHaveBeenNthCalledWith(3, "rsync", [
    "-a",
    "--delete",
    repo + "/",
    dest + "/",
  ]);
  expect(fs.existsSync(path.join(dest, "README.md"))).toBe(true);
  delete process.env.HF_TOKEN;
});
