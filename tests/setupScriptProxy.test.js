const fs = require("fs");
const path = require("path");

describe("setup script proxy handling", () => {
  test("does not unset system proxy vars", () => {
    const file = fs.readFileSync(
      path.join(__dirname, "..", "scripts", "setup.sh"),
      "utf8",
    );
    expect(file).toMatch(/unset npm_config_http_proxy npm_config_https_proxy/);
    expect(file).not.toMatch(/\bhttp_proxy\b/);
    expect(file).not.toMatch(/\bhttps_proxy\b/);
  });
});
