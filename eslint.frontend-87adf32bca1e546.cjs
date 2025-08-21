const react = require('eslint-plugin-react');
const jsxA11y = require('eslint-plugin-jsx-a11y');
const noInlineStyles = require('eslint-plugin-no-inline-styles');
const ts = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const htmlPlugin = require('@html-eslint/eslint-plugin');
const htmlParser = require('@html-eslint/parser');
const frontendRules = require('./scripts/eslint-frontend-rules');
const globals = require('globals');

module.exports = [
  {
    files: ['js/**/*.{js,jsx}', 'src/**/*.{js,jsx,tsx,ts}'],
    ignores: ['**/*.min.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.base.json'],
        tsconfigRootDir: __dirname,
      },
      globals: { ...globals.browser },
    },
    plugins: {
      react,
      jsxA11y,
      'no-inline-styles': noInlineStyles,
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
    files: ['*.html'],
    languageOptions: { parser: htmlParser, globals: { ...globals.browser } },
    plugins: {
      html: htmlPlugin,
      'no-inline-styles': noInlineStyles,
      frontendRules,
    },
    rules: {
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
