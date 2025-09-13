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
  testTimeout: 20000,
  maxWorkers: "50%",
  detectOpenHandles: true,
  verbose: true,
  bail: false,
  reporters: ["default", "jest-junit"],
  testEnvironment: "node",
  testRunner: "jest-circus/runner",
  testRetryTimes: 2,
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"],
  setupFiles: ["<rootDir>/jest.setup.env.js"],
};
