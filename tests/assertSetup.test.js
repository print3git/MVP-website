const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

describe("assert-setup", () => {
  const script = path.join("scripts", "assert-setup.js");
  const browsersPath = path.join(__dirname, "tmp-browsers");
  beforeAll(() => {
    fs.mkdirSync(browsersPath, { recursive: true });
    fs.writeFileSync(path.join(browsersPath, "dummy"), "");
  });
  afterAll(() => {
    fs.rmSync(browsersPath, { recursive: true, force: true });
  });
  test("exits without running setup when .setup-complete exists", () => {
    fs.writeFileSync(".setup-complete", "");
    const out = execFileSync("node", [script], {
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: browsersPath,
        MOCK_SETUP: "1",
      },
    }).toString();
    expect(out).toBe("");
    fs.unlinkSync(".setup-complete");
  });
  test("runs setup when markers missing", () => {
    const out = execFileSync("node", [script], {
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: "/nonexistent",
        MOCK_SETUP: "1",
      },
    }).toString();
    expect(out).toContain("MOCK_SETUP enabled");
  });
});
