// backend/jest.config.js
module.exports = {
  rootDir: ".",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.js"],
  testTimeout: 10000,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{js,jsx,ts,tsx}"],
  coveragePathIgnorePatterns: [
    "<rootDir>/db.js",
    "<rootDir>/shipping.js",
    "<rootDir>/social.js",
    "<rootDir>/utils/validateStl.js",
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
