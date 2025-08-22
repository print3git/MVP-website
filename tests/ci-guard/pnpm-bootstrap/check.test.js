const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  checkFiles,
} = require("../../../scripts/ci-guard/pnpm-bootstrap/check.js");

describe("pnpm bootstrap guard", () => {
  test("passes when block present", () => {
    const file = path.join(os.tmpdir(), "good-workflow.yml");
    fs.writeFileSync(
      file,
      "# >>> BEGIN MANAGED BLOCK: ci-guard:pnpm-bootstrap\n# <<< END MANAGED BLOCK: ci-guard:pnpm-bootstrap\n",
    );
    expect(() => checkFiles([file])).not.toThrow();
    fs.unlinkSync(file);
  });

  test("fails when block missing", () => {
    const file = path.join(os.tmpdir(), "bad-workflow.yml");
    fs.writeFileSync(file, "name: test");
    expect(() => checkFiles([file])).toThrow("Missing pnpm bootstrap block");
    fs.unlinkSync(file);
  });
});
