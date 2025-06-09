module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/setup.js', 'jest-localstorage-mock'],
  detectOpenHandles: true,
  verbose: true,
};
