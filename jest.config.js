module.exports = {
  setupFiles: [
    "<rootDir>/test/jest.setup.ts",
    "<rootDir>/backend/tests/setupGlobals.js",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/tests/utils/testEnv.ts",
    "<rootDir>/test/setupAuthMiddleware.js",
    "<rootDir>/tests/setup/nock.ts",
    "<rootDir>/tests/setup/teardown.ts",
  ],
  testTimeout: 60000,
  maxWorkers: 1,
  detectOpenHandles: true,
  forceExit: true,
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
    },
  },
};
