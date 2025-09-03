// backend/jest.config.js
module.exports = {
  rootDir: ".",
  preset: "ts-jest/presets/default",
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
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/*.spec.js", "**/*.test.js"],
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
};

module.exports = {
  ...module.exports,
  collectCoverage: true,
  collectCoverageFrom: [
    "**/*.{js,jsx,ts,tsx}",
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
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
    },
  },
};
