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
};

module.exports = {
  ...module.exports,
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    "<rootDir>/backend/db.js",
    "<rootDir>/backend/shipping.js",
    "<rootDir>/backend/social.js",
    "<rootDir>/backend/utils/validateStl.js",
  ],
  coverageThreshold: {
    global: {
      branches: 54,
      functions: 55,
      lines: 65,
      statements: 64,
    },
    "backend/**/*.{js,jsx,ts,tsx}": {
      branches: 55,
    },
  },
};
