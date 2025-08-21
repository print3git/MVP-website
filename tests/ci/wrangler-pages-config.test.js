const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function parseToml(str) {
  try {
    const toml = require("toml");
    return toml.parse(str);
  } catch {
    const out = {};
    str.split(/\n+/).forEach((line) => {
      const m = line.match(/^\s*([^#=]+)\s*=\s*"?([^"#]+)"?/);
      if (m) out[m[1].trim()] = m[2].trim();
    });
    return out;
  }
}

const wranglerPath = path.join(process.cwd(), "wrangler.toml");

test("wrangler.toml pages config", () => {
  if (!fs.existsSync(wranglerPath)) {
    test.skip("no wrangler.toml");
    return;
  }
  const config = parseToml(fs.readFileSync(wranglerPath, "utf8"));
  const errors = [];
  if ("build" in config)
    errors.push('remove "build" (Pages uses pages_build_output_dir)');
  if (!config.name) errors.push("missing name");
  if (!config.pages_build_output_dir)
    errors.push("missing pages_build_output_dir");
  if (errors.length) {
    assert.fail(
      `wrangler.toml invalid: ${errors.join(", ")}. See Cloudflare Pages docs for fixes.`,
    );
  }
});
