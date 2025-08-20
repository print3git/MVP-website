const fs = require('fs');
const path = require('path');
const projects = ['tsconfig.json', 'tsconfig.build.json']
  .map((p) => path.join(__dirname, p))
  .filter(fs.existsSync);

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    tsconfigRootDir: __dirname,
    ...(projects.length ? { project: projects } : {}),
  },
  extends: ['eslint:recommended', 'prettier'],
  env: { node: true, jest: true },
  plugins: ['promise', '@typescript-eslint'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.object.name='describe'][callee.property.name='only']",
        message: 'Do not commit describe.only',
      },
      {
        selector: "CallExpression[callee.object.name='test'][callee.property.name='only']",
        message: 'Do not commit test.only',
      },
      {
        selector: "CallExpression[callee.object.name='describe'][callee.property.name='skip']",
        message: 'Avoid describe.skip',
      },
      {
        selector: "CallExpression[callee.object.name='test'][callee.property.name='skip']",
        message: 'Avoid test.skip',
      },
    ],

    'promise/no-floating-promises': 'error',
    'no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],

  },
};
