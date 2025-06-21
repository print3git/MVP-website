const js = require("@eslint/js");
const prettier = require("eslint-config-prettier");
const jsdoc = require("eslint-plugin-jsdoc");
const globals = require("globals");

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
      "backend",
      "e2e",
    ],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  js.configs.recommended,
  jsdoc.configs["flat/recommended"],
  {
    plugins: { jsdoc },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "jsdoc/require-param": "error",
    },
  },
  {
    files: ["backend/**/*", "backend/scripts/**/*"],
    rules: { "jsdoc/require-jsdoc": "off" },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: { "jsdoc/require-jsdoc": "error" },
  },
  prettier,
];
