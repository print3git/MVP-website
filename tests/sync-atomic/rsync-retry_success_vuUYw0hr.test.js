const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("rsync retries on code 255 then succeeds", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "hello");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  child_process.spawnSync
    .mockReturnValueOnce({ status: 0 }) // clone
    .mockReturnValueOnce({ status: 0 }) // lfs
    .mockReturnValueOnce({ status: 255 }) // rsync fail
    .mockReturnValueOnce({ status: 0 }); // rsync retry
  const code = syncFlow(repo, dest, { rsyncRetries: 2 });
  expect(code).toBe(0);
  expect(child_process.spawnSync).toHaveBeenCalledTimes(4);
  delete process.env.HF_TOKEN;
});
