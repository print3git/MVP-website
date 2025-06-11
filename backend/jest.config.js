// backend/jest.config.js
module.exports = {
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
