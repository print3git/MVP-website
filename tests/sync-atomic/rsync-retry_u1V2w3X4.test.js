const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("Rsync retry logic", () => {
  test("retries once on code 255", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    spawnSync
      .mockReturnValueOnce({ status: 0 }) // clone
      .mockReturnValueOnce({ status: 0 }) // lfs pull
      .mockReturnValueOnce({ status: 255 })
      .mockReturnValueOnce({ status: 0 });
    sync({ repo: "owner/repo", dest: temp, hfToken: "t" });
    expect(spawnSync).toHaveBeenCalledTimes(4);
  });
});
