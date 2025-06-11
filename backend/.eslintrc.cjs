module.exports = {
  extends: ['@eslint/js', 'prettier'],
  env: { node: true, jest: true },
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: "CallExpression[callee.object.name='describe'][callee.property.name='only']", message: 'Do not commit describe.only' },
      { selector: "CallExpression[callee.object.name='test'][callee.property.name='only']", message: 'Do not commit test.only' },
      { selector: "CallExpression[callee.object.name='describe'][callee.property.name='skip']", message: 'Avoid describe.skip' },
      { selector: "CallExpression[callee.object.name='test'][callee.property.name='skip']", message: 'Avoid test.skip' },
    ],
  },
};
