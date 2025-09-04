// backend/jest.config.js
let config;
try {
  require.resolve("ts-jest");
  config = {
    rootDir: ".",
    setupFiles: ["<rootDir>/tests/setupGlobals.js"],
    setupFilesAfterEnv: [
      "<rootDir>/tests/utils/testEnv.ts",
      "<rootDir>/tests/setup.js",
    ],
    globalTeardown: "<rootDir>/tests/globalTeardown.js",
    testEnvironment: "node",
    transform: {
      "^.+\\.[tj]s$": "ts-jest",
    },
    testMatch: [
      "**/*.spec.ts",
      "**/*.spec.js",
      "**/*.test.ts",
      "**/*.test.js",
      "**/*.test.*.ts",
      "**/*.test.*.js",
    ],
    moduleFileExtensions: ["ts", "js", "json"],
    testTimeout: 20000,
    maxWorkers: "50%",
    detectOpenHandles: true,
    verbose: true,
    bail: false,
    reporters: ["default", "jest-junit"],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "json-summary"],
    moduleNameMapper: {
      "^stripe$": "<rootDir>/tests/stripe/__mocks__/stripe.ts",
      "^../../db$": "<rootDir>/tests/__mocks__/db.ts",
      "^pg$": "<rootDir>/tests/db/__mocks__/pg.ts",
      "^\\./server(?:\\.js)?$": "<rootDir>/src/app",
      "^\\.\\./server(?:\\.js)?$": "<rootDir>/src/app",
      "^\\.\\./\\.\\./server(?:\\.js)?$": "<rootDir>/src/app",
    },
    collectCoverage: true,
    collectCoverageFrom: ["<rootDir>/utils/getEnv.js", "<rootDir>/users.js"],
    coveragePathIgnorePatterns: [],
    coverageThreshold: {
      global: {
        lines: 80,
        branches: 70,
        functions: 75,
        statements: 80,
      },
    },
  };
} catch {
  config = require("./jest.config.offline.js");
}

module.exports = config;
