module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  env: { node: true, jest: true },
  plugins: ['promise'],
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
