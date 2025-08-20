const { spawnSync } = require("child_process");

// ensure the eslint config loads without throwing
let eslintConfigLoaded = false;
try {
  require.resolve("../eslint.config.js");
  eslintConfigLoaded = true;
} catch (err) {
  console.error("Failed to load eslint.config.js", err);
}

test("repository passes ESLint with no warnings", () => {
  try {
    expect(eslintConfigLoaded).toBe(true);
    const result = spawnSync(
      "npx",
      [
        "eslint",
        "--ignore-pattern",
        "frontend/**/*",
        "backend/**/*.{js,ts,tsx}",
        "scripts/**/*.js",
        "-f",
        "json",
        "--max-warnings=0",
        "--no-error-on-unmatched-pattern",
      ],
      {
        encoding: "utf-8",
        shell: false,
        env: { ...process.env, CI: "true", ESLINT_USE_FLAT_CONFIG: "false" },
      },
    );

    if (result.status !== 0) {
      if (result.stderr) console.error(result.stderr);
    }
    expect(result.status).toBe(0);
  } catch (err) {
    console.error(err);
    return expect(err).toBeUndefined();
  }
});
