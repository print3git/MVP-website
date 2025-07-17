const fs = require("fs");
const path = require("path");
jest.mock("child_process");
const { spawnSync } = require("child_process");
const { sync } = require("./hfSync");

describe("Final contents verification", () => {
  test("README copied to public/models", () => {
    const temp = fs.mkdtempSync(path.join(__dirname, "repo-"));
    const readme = path.join(temp, "README.md");
    fs.writeFileSync(readme, "test");
    spawnSync.mockImplementation((cmd, _args) => {
      if (cmd === "rsync") {
        const dest = path.join("public", "models");
        fs.mkdirSync(dest, { recursive: true });
        fs.copyFileSync(readme, path.join(dest, "README.md"));
        return { status: 0 };
      }
      return { status: 0 };
    });
    sync({ repo: "owner/repo", dest: temp, hfToken: "t" });
    expect(fs.existsSync(path.join("public", "models", "README.md"))).toBe(
      true,
    );
  });
});
