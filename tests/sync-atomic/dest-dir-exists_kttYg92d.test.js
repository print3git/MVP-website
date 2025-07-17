const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("existing destination is overwritten", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "new");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  fs.writeFileSync(path.join(dest, "README.md"), "old");
  child_process.spawnSync
    .mockReturnValueOnce({ status: 0 }) // clone
    .mockReturnValueOnce({ status: 0 }) // lfs
    .mockReturnValueOnce({ status: 0 }); // rsync
  const code = syncFlow(repo, dest);
  expect(code).toBe(0);
  const content = fs.readFileSync(path.join(dest, "README.md"), "utf8");
  expect(content).toBe("new");
  delete process.env.HF_TOKEN;
});
