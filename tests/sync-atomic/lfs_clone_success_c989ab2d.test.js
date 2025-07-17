const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

jest.mock("child_process");

async function runSync(dir) {
  await run("git", ["clone", "repo.git", dir]);
  await run("git", ["lfs", "pull"], { cwd: dir });
}
function run(cmd, args, opts) {
  return new Promise((res, rej) => {
    const p = child_process.spawn(cmd, args, opts);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(String(c)))));
  });
}

test("clone and lfs pull succeed", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  child_process.spawn.mockImplementation(() => ({
    on: (e, cb) => e === "close" && cb(0),
  }));
  await expect(runSync(dir)).resolves.toBeUndefined();
  expect(child_process.spawn).toHaveBeenCalledWith(
    "git",
    ["clone", "repo.git", dir],
    undefined,
  );
  expect(child_process.spawn).toHaveBeenCalledWith("git", ["lfs", "pull"], {
    cwd: dir,
  });
});
