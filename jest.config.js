module.exports = {
  setupFiles: ["<rootDir>/backend/tests/setupGlobals.js"],
  testMatch: ["**/*.test.js", "**/*.test.ts"],
  coverageThreshold: {
    global: {
      branches: 0,
      lines: 0,
      functions: 0,
      statements: 0,
    },
  },
};
