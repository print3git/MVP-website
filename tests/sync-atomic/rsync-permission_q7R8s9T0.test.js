const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("Rsync permissions", () => {
  test("errors when file unreadable", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    spawnSync
      .mockReturnValueOnce({ status: 0 }) // clone
      .mockReturnValueOnce({ status: 0 }) // lfs pull
      .mockReturnValueOnce({ status: 23 }); // rsync permission denied
    expect(() =>
      sync({ repo: "owner/repo", dest: temp, hfToken: "t" }),
    ).toThrow();
  });
});
