// backend/jest.config.js
module.exports = {
  rootDir: ".",
  setupFiles: ["<rootDir>/tests/setupGlobals.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": "babel-jest",
  },
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 10000,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
};

module.exports = {
  ...module.exports,
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{js,jsx,ts,tsx}"],
  coveragePathIgnorePatterns: [
    "<rootDir>/backend/db.js",
    "<rootDir>/backend/shipping.js",
    "<rootDir>/backend/social.js",
    "<rootDir>/backend/utils/validateStl.js",
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
