const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");

function getVerifyFiles() {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "run-jest.js"),
    "utf8",
  );
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

test("trims whitespace from test file paths", () => {
  const verifyFiles = getVerifyFiles();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rj-"));
  const file = path.join(dir, "one.test.js");
  fs.writeFileSync(file, "");
  try {
    const result = verifyFiles([`  ${file}  `]);
    expect(result).toContain(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
