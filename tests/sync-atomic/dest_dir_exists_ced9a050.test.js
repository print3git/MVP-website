const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

jest.mock("child_process");

async function sync(src, dest) {
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  await run("rsync", ["-a", src + "/", dest]);
}
function run(_cmd, _args) {
  return new Promise((res) => {
    child_process.spawn.mockImplementationOnce(() => ({
      on: (e, cb) => e === "close" && cb(0),
    }));
    res();
  });
}

test("cleans existing destination", async () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), "src-"));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  fs.writeFileSync(path.join(dest, "old"), "x");
  await sync(src, dest);
  expect(fs.existsSync(path.join(dest, "old"))).toBe(false);
});
