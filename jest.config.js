module.exports = {
  setupFiles: [
    "<rootDir>/test/jest.setup.ts",
    "<rootDir>/backend/tests/setupGlobals.js",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/test/setupAuthMiddleware.js",
    "<rootDir>/tests/setup/nock.ts",
    "<rootDir>/tests/setup/teardown.ts",
  ],
  testTimeout: 120000,
  maxWorkers: "50%",
  detectOpenHandles: true,
  forceExit: true,
  coverageThreshold: {
    global: {
      branches: 55,
      lines: 90,
      functions: 90,
      statements: 90,
    },
    "backend/**/*.{js,ts}": {
      branches: 55,
    },
  },
};
