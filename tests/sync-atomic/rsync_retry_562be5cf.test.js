const child_process = require("child_process");

jest.mock("child_process");

async function sync() {
  for (let i = 0; i < 2; i++) {
    try {
      await run("rsync", ["-a", "src/", "dest"]);
      return true;
    } catch (e) {
      if (i === 1) throw e;
    }
  }
}
function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = child_process.spawn(cmd, args);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(String(c)))));
  });
}

test("retry rsync once on failure", async () => {
  child_process.spawn
    .mockImplementationOnce(() => ({ on: (e, cb) => e === "close" && cb(255) }))
    .mockImplementationOnce(() => ({ on: (e, cb) => e === "close" && cb(0) }));
  await expect(sync()).resolves.toBe(true);
  expect(child_process.spawn).toHaveBeenCalledTimes(2);
});
