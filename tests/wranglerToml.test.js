const fs = require("fs");
const toml = require("toml");

describe("wrangler.toml", () => {
  test("pages_build_output_dir points to frontend/dist", () => {
    const content = fs.readFileSync("wrangler.toml", "utf8");
    const config = toml.parse(content);
    expect(config.pages_build_output_dir).toBe("frontend/dist");
  });
});
