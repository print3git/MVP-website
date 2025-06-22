module.exports = {
  coverageThreshold: {
    global: {
      branches: 54,
      lines: 65,
      functions: 55,
      statements: 64,
    },
    "backend/**/*.{js,jsx,ts,tsx}": {
      branches: 55,
    },
  },
};
