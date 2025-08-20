module.exports = {
  setupFiles: [
    "<rootDir>/test/jest.setup.ts",
    "<rootDir>/backend/tests/setupGlobals.js",
  ],
  globalSetup: "<rootDir>/tests/setup/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/setup/globalTeardown.ts",
  setupFilesAfterEnv: [
    "<rootDir>/tests/setup/http-guard.ts",
    "<rootDir>/tests/setup/teardown.ts",
  ],
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
