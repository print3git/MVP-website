module.exports = {
  setupFiles: [
    "<rootDir>/test/jest.setup.ts",
    "<rootDir>/backend/tests/setupGlobals.js",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/test/setupAuthMiddleware.js",
    "<rootDir>/tests/setup/nock.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
    },
  },
};
