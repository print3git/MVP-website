const eslintConfig = require("../eslint.config.js");

/** Ensure jsdoc requirement is disabled for tests directory */
test("jsdoc rule disabled for tests", () => {
  const override = eslintConfig.find(
    (cfg) => Array.isArray(cfg.files) && cfg.files.includes("tests/**/*"),
  );
  expect(override).toBeDefined();
  expect(override.rules["jsdoc/require-jsdoc"]).toBe("off");
});
