const fs = require("fs");
const path = require("path");

describe("lfs migrate enforce", () => {
  test(".gitattributes has managed block", () => {
    const attrs = fs.readFileSync(path.join(__dirname, "../../../.gitattributes"), "utf8");
    expect(attrs).toMatch(/BEGIN MANAGED BLOCK: ci-guard:lfs-migrate-enforce/);
    expect(attrs).toMatch(/img\/\*\.png filter=lfs diff=lfs merge=lfs -text/);
    expect(attrs).toMatch(/img\/\*\.jpg filter=lfs diff=lfs merge=lfs -text/);
  });
});
