// backend/jest.config.offline.js
module.exports = {
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setupGlobals.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/*.spec.js", "**/*.test.js"],
  moduleFileExtensions: ["js", "json"],
  testTimeout: 20000,
  maxWorkers: "50%",
  detectOpenHandles: true,
  verbose: true,
  bail: false,
  reporters: ["default", "jest-junit"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
  moduleNameMapper: {
    "^stripe$": "<rootDir>/tests/stripe/__mocks__/stripe.js",
    "^../../db$": "<rootDir>/tests/__mocks__/db.js",
    "^pg$": "<rootDir>/tests/db/__mocks__/pg.js",
    "^\\./server(?:\\.js)?$": "<rootDir>/src/app",
    "^\\.\\./server(?:\\.js)?$": "<rootDir>/src/app",
    "^\\.\\./\\.\\./server(?:\\.js)?$": "<rootDir>/src/app",
  },
};

module.exports = {
  ...module.exports,
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.js",
    "!<rootDir>/node_modules/**",
    "!<rootDir>/coverage/**",
    "!<rootDir>/tests/**",
  ],
  coveragePathIgnorePatterns: [
    "<rootDir>/db.js",
    "<rootDir>/shipping.js",
    "<rootDir>/social.js",
    "<rootDir>/utils/validateStl.js",
    "<rootDir>/node_modules/",
    "<rootDir>/tests/",
    "<rootDir>/coverage/",
  ],
};
