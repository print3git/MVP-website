const existingConfig = {
  setupFiles: ["<rootDir>/backend/tests/setupGlobals.js"],
  setupFilesAfterEnv: ["<rootDir>/test/setupAuthMiddleware.js"],
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

module.exports = {
  ...existingConfig,
  maxWorkers: "75%",
  testTimeout: 15000,
  verbose: true,
};
