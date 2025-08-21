const fs = require("fs");
const toml = require("toml");

const content = fs.readFileSync("wrangler.toml", "utf8");
const config = toml.parse(content);

describe("wrangler.toml", () => {
  test("env.production.pages_build_output_dir points to frontend/dist", () => {
    expect(config.env.production.pages_build_output_dir).toBe("frontend/dist");
  });

  test("env.preview.pages_build_output_dir points to frontend/dist", () => {
    expect(config.env.preview.pages_build_output_dir).toBe("frontend/dist");
  });
});
