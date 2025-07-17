const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

jest.mock("child_process");

function run(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = child_process.spawn(cmd, args, opts);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error("code " + c))));
    if (opts && opts.timeout) {
      // immediately reject to simulate timeout
      rej(new Error("timeout"));
    }
  });
}
async function runSync(dir) {
  await run("git", ["lfs", "pull"], { cwd: dir, timeout: 1 });
}

jest.setTimeout(500);
jest.useRealTimers();
test("lfs pull times out", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  child_process.spawn.mockImplementation(() => ({
    kill: jest.fn(),
    on: (event, _cb) => {
      if (event === "close") {
        // never called automatically
      }
    },
  }));
  await expect(runSync(dir)).rejects.toThrow("timeout");
});
