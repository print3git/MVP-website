// backend/jest.config.js
module.exports = {
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setupGlobals.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": "babel-jest",
  },
  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "json-summary"],
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
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};
