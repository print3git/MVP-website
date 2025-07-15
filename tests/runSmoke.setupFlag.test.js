const fs = require("fs");
const path = require("path");

const flag = path.join(__dirname, "..", ".setup-complete");

afterEach(() => {
  if (fs.existsSync(flag)) fs.unlinkSync(flag);
  delete process.env.SKIP_PW_DEPS;
  jest.resetModules();
});

test("run-smoke sets SKIP_PW_DEPS when setup flag exists", () => {
  fs.writeFileSync(flag, "");
  jest.isolateModules(() => {
    const { env } = require("../scripts/run-smoke.js");
    expect(env.SKIP_PW_DEPS).toBe("1");
  });
});

test("existing SKIP_PW_DEPS is preserved", () => {
  fs.writeFileSync(flag, "");
  process.env.SKIP_PW_DEPS = "0";
  jest.isolateModules(() => {
    const { env } = require("../scripts/run-smoke.js");
    expect(env.SKIP_PW_DEPS).toBe("0");
  });
});
