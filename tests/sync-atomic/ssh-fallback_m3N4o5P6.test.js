const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("SSH vs HTTPS fallback", () => {
  test("falls back when ssh clone fails", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    spawnSync
      .mockReturnValueOnce({ status: 1 }) // ssh clone fails
      .mockReturnValueOnce({ status: 0 }) // https clone
      .mockReturnValue({ status: 0 }); // lfs pull & rsync
    sync({ repo: "owner/repo", dest: temp, hfToken: "t", useSSH: true });
    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      "git",
      ["clone", "git@huggingface.co:owner/repo.git", temp],
      expect.any(Object),
    );
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      "git",
      ["clone", "https://huggingface.co/owner/repo.git", temp],
      expect.any(Object),
    );
  });
});
