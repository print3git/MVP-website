const fs = require("fs");
const path = require("path");
const vm = require("vm");

test("fails with helpful message when wait-on is missing", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "run-jest.js"),
    "utf8",
  );
  const errors: string[] = [];
  const sandbox: any = {
    module: { exports: {} },
    require: (mod: string) => {
      if (mod === "wait-on") {
        const err: any = new Error("Cannot find module 'wait-on'");
        err.code = "MODULE_NOT_FOUND";
        throw err;
      }
      return require(mod);
    },
    console: { error: (msg: unknown) => errors.push(String(msg)) },
    process: { exit: (code: number) => (sandbox.exitCode = code) },
    __dirname: path.join(__dirname, ".."),
  };
  vm.runInNewContext(src, sandbox);
  expect(sandbox.exitCode).toBe(1);
  expect(errors.join(" ")).toContain("wait-on is not installed");
});
