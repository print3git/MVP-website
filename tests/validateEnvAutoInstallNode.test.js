const fs = require("fs");
const path = require("path");

describe("validate-env auto install node", () => {
  test("script installs required node when version mismatched", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "validate-env.sh"),
      "utf8",
    );
    expect(content).toMatch(/Installing Node \$required_node_major via mise/);
    expect(content).toMatch(/mise use -g node@\$required_node_major/);
  });
});
