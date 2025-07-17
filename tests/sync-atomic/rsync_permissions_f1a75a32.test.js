const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

jest.mock("child_process");

async function sync(src, dest) {
  await run("rsync", ["-a", src + "/", dest]);
}
function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = child_process.spawn(cmd, args);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(String(c)))));
  });
}

test("rsync fails on unreadable file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-src-"));
  fs.writeFileSync(path.join(dir, "file"), "x", { mode: 0o200 });
  child_process.spawn.mockImplementation(() => ({
    on: (e, cb) => e === "close" && cb(1),
  }));
  await expect(sync(dir, "dest")).rejects.toThrow("1");
});
