const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

function getVerifyFiles() {
  const src = fs.readFileSync(path.join(__dirname, "..", "run-jest.js"), "utf8");
  const sandbox = {
    module: { exports: {} },
    require,
    __dirname: path.join(__dirname, ".."),
    process,
    console,
  };
  vm.runInNewContext(src, sandbox);
  return sandbox.verifyFiles;
}

test("expands directory into matching test files", () => {
  const verifyFiles = getVerifyFiles();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rj-"));
  const files = [
    path.join(dir, "one.test.js"),
    path.join(dir, "two.spec.js"),
    path.join(dir, "note.js"),
  ];
  fs.writeFileSync(files[0], "");
  fs.writeFileSync(files[1], "");
  fs.writeFileSync(files[2], "");
  try {
    const result = verifyFiles([dir]);
    expect(result).toContain(files[0]);
    expect(result).toContain(files[1]);
    expect(result).not.toContain(files[2]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

