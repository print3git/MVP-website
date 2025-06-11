module.exports = {
  rootDir: 'backend',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testEnvironment: 'node',     // or 'jsdom' if you have browser tests
  testMatch: ['<rootDir>/tests/**/*.test.js'],
};
