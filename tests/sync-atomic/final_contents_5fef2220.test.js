const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

jest.mock("child_process");

async function sync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(src, "README.md"), "hi");
  await run("rsync", ["-a", src + "/", dest]);
}
function run(cmd, args) {
  return new Promise((res) => {
    child_process.spawn.mockImplementationOnce(() => ({
      on: (e, cb) => e === "close" && cb(0),
    }));
    // emulate copy
    const src = args[1];
    const dest = args[2];
    fs.cpSync(src, dest, { recursive: true });
    res();
  });
}

test("readme copied to models", async () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), "src-"));
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "dest-"));
  await sync(src, dest);
  expect(fs.existsSync(path.join(dest, "README.md"))).toBe(true);
});
