const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const globals = require('globals');
const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
  js.configs.recommended,
  {
    plugins: {
      jsdoc,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'jsdoc/require-jsdoc': ['error', { publicOnly: true }],
      'jsdoc/require-param': 'error',
    },
  },
  prettier,
];
