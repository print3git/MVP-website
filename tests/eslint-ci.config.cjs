const baseConfig = require("../eslint.config.js");

module.exports = [
  ...baseConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs}"] ,
    ignores: ["tests/**"],
    settings: {
      jsdoc: {
        tagNamePreference: {
          "jest-environment": false,
          todo: false,
          fixme: false,
        },
      },
    },
    rules: {
      "no-console": "error",
      "jsdoc/require-jsdoc": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/check-tag-names": "error",
    },
  },
];
