import fs from "fs";
import path from "path";
import toml from "toml";

export function validateWrangler(
  filePath = path.join(__dirname, "..", "..", "wrangler.toml"),
): void {
  if (!fs.existsSync(filePath)) {
    console.log("wrangler.toml not found; skipping");
    return;
  }
  const content = fs.readFileSync(filePath, "utf8");
  const config = toml.parse(content);
  const errors: string[] = [];
  if ("build" in config) {
    errors.push('remove "build" (Pages uses pages_build_output_dir)');
  }
  if (config.pages_build_output_dir !== "frontend/dist") {
    errors.push('pages_build_output_dir must be "frontend/dist"');
  }
  if (errors.length) {
    throw new Error(`wrangler.toml invalid: ${errors.join(", ")}`);
  }
}

if (require.main === module) {
  try {
    validateWrangler();
    console.log("wrangler.toml OK");
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
