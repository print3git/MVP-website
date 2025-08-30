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
  retryTimes: 2,
  moduleNameMapper: {
    "^https://cdn\\.jsdelivr\\.net/npm/three@0\\.152\\.2/build/three\\.module\\.js$":
      "<rootDir>/tests/load-model-pipeline/mocks/three.js",
    "^https://cdn\\.jsdelivr\\.net/npm/three@0\\.152\\.2/examples/jsm/loaders/GLTFLoader\\.js$":
      "<rootDir>/tests/load-model-pipeline/mocks/gltfLoader.js",
  },
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
    },
  },
};
