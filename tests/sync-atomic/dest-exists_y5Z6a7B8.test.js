const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("Destination dir exists", () => {
  test("overwrites existing directory", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    fs.writeFileSync(path.join(temp, "old"), "x");
    spawnSync.mockReturnValue({ status: 0 });
    sync({ repo: "owner/repo", dest: temp, hfToken: "t" });
    expect(fs.existsSync(path.join(temp, "old"))).toBe(false);
  });
});
