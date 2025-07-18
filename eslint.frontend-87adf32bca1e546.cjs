const react = require('eslint-plugin-react');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const noInlineStyles = require('eslint-plugin-no-inline-styles');
const ts = require('@typescript-eslint/eslint-plugin');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const htmlParser = require('@html-eslint/parser');
const frontendRules = require('./scripts/eslint-frontend-rules');

module.exports = [
  {
    files: ['js/**/*.{js,jsx}', 'src/**/*.{js,jsx,tsx,ts}', '*.html'],
    ignores: ['**/*.min.js'],
    languageOptions: {
      parser: htmlParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      jsxA11y,
      'no-inline-styles': noInlineStyles,
      html: htmlPlugin,
      frontendRules,
      '@typescript-eslint': ts,
    },
    rules: {
      'no-console': 'error',
      'no-inline-styles/no-inline-styles': 'error',
      'frontendRules/no-hardcoded-colors': 'error',
      'frontendRules/button-requires-aria': 'error',
      'frontendRules/controlled-input': 'error',
      'frontendRules/no-deprecated-html-tags': 'error',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
