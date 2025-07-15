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

module.exports = [
  {
    ignores: [
      "node_modules",
      "img",
      "uploads",
      "models",
      "js",
      "*.html",
      "service-worker.js",
      "admin",
      "docs",
      "e2e",
      "backend",
      "scripts/ci_watchdog.ts",
      "scripts/ci_watchdog.js",
      "upload",
      "src",
    ],
    settings: {
      jsdoc: {
        tagNamePreference: {
          "jest-environment": false,
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
    ignores: ["backend/**/*", "backend/scripts/**/*"],
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
    files: ["tests/**/*"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
];
