const child_process = require("child_process");
const spawn = jest.spyOn(child_process, "spawn");

async function runScript() {
  return new Promise((res, rej) => {
    const p = child_process.spawn("bash", ["scripts/sync-space.sh"], {
      env: {},
    });
    p.on("close", (c) => (c === 0 ? res() : rej(new Error(String(c)))));
  });
}

test("fails without token", async () => {
  spawn.mockImplementation(() => ({ on: (e, cb) => e === "close" && cb(1) }));
  await expect(runScript()).rejects.toThrow("1");
});
