const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("LFS fetch timeout", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "hello");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  child_process.spawnSync
    .mockReturnValueOnce({ status: 0 }) // git clone
    .mockReturnValueOnce({ status: null }) // git lfs pull timeout
    .mockReturnValueOnce({ status: 0 }); // rsync
  const code = syncFlow(repo, dest);
  expect(code).toBe(124);
  delete process.env.HF_TOKEN;
});
