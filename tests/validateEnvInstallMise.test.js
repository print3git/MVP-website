const fs = require("fs");
const path = require("path");

describe("validate-env script", () => {
  test("installs mise when missing", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "validate-env.sh"),
      "utf8",
    );
    expect(content).toContain("install-mise.sh");
    expect(content).toContain('export PATH="$HOME/.local/bin:$PATH"');
  });
});
