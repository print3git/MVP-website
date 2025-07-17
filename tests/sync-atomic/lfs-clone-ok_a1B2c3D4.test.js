const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("LFS clone succeeds", () => {
  test("git clone and lfs pull run", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    spawnSync.mockReturnValue({ status: 0 });
    sync({ repo: "owner/repo", dest: temp, hfToken: "t" });
    expect(spawnSync).toHaveBeenCalledWith(
      "git",
      ["clone", "https://huggingface.co/owner/repo.git", temp],
      expect.any(Object),
    );
    expect(spawnSync).toHaveBeenCalledWith(
      "git",
      ["lfs", "pull"],
      expect.objectContaining({ cwd: temp, timeout: 10000 }),
    );
  });
});
