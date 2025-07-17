const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("LFS fetch timeout", () => {
  test("times out gracefully", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    spawnSync
      .mockReturnValueOnce({ status: 0 }) // clone
      .mockReturnValueOnce({ status: 1, error: new Error("ETIMEDOUT") });
    expect(() =>
      sync({ repo: "owner/repo", dest: temp, hfToken: "t", lfsTimeout: 1 }),
    ).toThrow();
  });
});
