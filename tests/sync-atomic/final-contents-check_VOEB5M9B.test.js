const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
jest.mock("child_process");
const { syncFlow } = require("./hfSyncFlow");

test("README copied to public/models", () => {
  process.env.HF_TOKEN = "test";
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  fs.writeFileSync(path.join(repo, "README.md"), "content");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "public-models-"));
  child_process.spawnSync
    .mockReturnValueOnce({ status: 0 })
    .mockReturnValueOnce({ status: 0 })
    .mockReturnValueOnce({ status: 0 });
  const code = syncFlow(repo, dest);
  expect(code).toBe(0);
  expect(fs.existsSync(path.join(dest, "README.md"))).toBe(true);
  delete process.env.HF_TOKEN;
});
