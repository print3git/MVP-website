// Display a helpful message if dependencies have not been installed.
try {
  require.resolve("@eslint/js");
} catch {
  console.error(
    "Dependencies not installed. Run 'npm run setup' at the repository root.",
  );
  process.exit(1);
}

const js = require("@eslint/js");
const prettier = require("eslint-config-prettier");
const globals = require("globals");
const jsdoc = require("eslint-plugin-jsdoc");
const frontend = require("./eslint.frontend-87adf32bca1e546.cjs");

module.exports = [
  {
    ignores: [
      "node_modules",
      "img/**",
      "uploads/**",
      "models/**",
      // front-end code will be linted separately
      // "js/**", // removed to enable frontend linting
      // "*.html", // removed to enable frontend linting
      "js/model-viewer.min.js",
      "service-worker.js",
      "admin/**",
      "docs/**",
      "e2e/**",
      "backend/**",
      "scripts/ci_watchdog.ts",
      "scripts/ci_watchdog.js",
      "scripts/check-gh-workflow-sync-23859.ts",
      "upload/**",
      // "src/**", // removed to enable frontend linting
    ],
  },
  {
    settings: {
      jsdoc: {
        tagNamePreference: {
          "jest-environment": "jest-environment",
        },
        additionalTagNames: {
          custom: ["jest-environment"],
        },
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 12,
      globals: { ...globals.node, ...globals.es2021, ...globals.jest },
    },
  },
  js.configs.recommended,
  prettier,
  {
    plugins: { jsdoc },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "jsdoc/require-param": "error",
    },
  },
  jsdoc.configs["flat/recommended"],
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    ignores: [
      "backend/**/*",
      "backend/scripts/**/*",
      "img/**",
      "uploads/**",
      "models/**",
      "js/**",
      "admin/**",
      "docs/**",
      "e2e/**",
      "backend/**",
      "upload/**",
      "src/**",
    ],
    rules: { "jsdoc/require-jsdoc": "error" },
  },
  {
    files: ["backend/**/*", "backend/scripts/**/*"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
  {
    files: ["scripts/**/*"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
  {
    files: ["js/**/*"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
  {
    files: ["tests/**/*"],
    rules: {
      "jsdoc/require-jsdoc": "off",
    },
  },
  ...frontend,
];
