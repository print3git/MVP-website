const path = require('path');

module.exports = {
  displayName: 'ci',
  rootDir: path.resolve(__dirname, '../..'),
  testMatch: ['<rootDir>/tests/ci/**/*.regression.test.[jt]s'],
  testEnvironment: 'node',
  maxWorkers: 2,
  testTimeout: 30000,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'tests/.artifacts', outputName: 'ci-junit.xml' }],
  ],
};
