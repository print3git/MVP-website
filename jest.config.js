module.exports = {
  coverageThreshold: {
    global: {
      branches: 55,
      lines: 90,
      functions: 90,
      statements: 90,
    },
    "backend/**/*.{js,ts}": {
      branches: 55,
    },
  },
};
