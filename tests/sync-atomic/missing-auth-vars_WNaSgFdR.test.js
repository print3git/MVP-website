const fs = require("fs");
const path = require("path");
const os = require("os");
const { syncFlow } = require("./hfSyncFlow");

test("missing auth vars exits non-zero", () => {
  delete process.env.HF_TOKEN;
  delete process.env.HF_API_KEY;
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "repo-"));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  expect(() => syncFlow(repo, dest)).toThrow(
    "HF_TOKEN or HF_API_KEY must be set",
  );
});
