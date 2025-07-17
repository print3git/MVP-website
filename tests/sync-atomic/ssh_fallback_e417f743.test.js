const child_process = require("child_process");

jest.mock("child_process");

async function clone() {
  await run("git", ["clone", "git@hf:repo.git"]);
}
function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = child_process.spawn(cmd, args);
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(String(c)))));
  });
}

test("fallbacks to https after ssh failure", async () => {
  child_process.spawn
    .mockImplementationOnce(() => ({ on: (e, cb) => e === "close" && cb(1) }))
    .mockImplementationOnce(() => ({ on: (e, cb) => e === "close" && cb(0) }));
  await expect(clone()).rejects.toThrow();
  await run("git", ["clone", "https://hf.co/repo.git"]);
  expect(child_process.spawn).toHaveBeenCalledTimes(2);
});
