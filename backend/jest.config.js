module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['jest-localstorage-mock', '<rootDir>/tests/setup.js'],
  globalTeardown: './jest.teardown.js',
};
