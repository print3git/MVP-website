const path = require("path");

module.exports = {
  displayName: "frontend",
  rootDir: path.resolve(__dirname, "../.."),
  testMatch: ["<rootDir>/tests/frontend/**/?(*.)+(test).[jt]s?(x)"],
  testEnvironment: "jsdom",
  maxWorkers: 2,
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/tests/utils/jest.setup.js"],
  reporters: [
    "default",
    [
      "jest-junit",
      { outputDirectory: "tests/.artifacts", outputName: "frontend-junit.xml" },
    ],
  ],
  coverageDirectory: "coverage/frontend",
  coverageThreshold: {
    global: { lines: 70, branches: 70 },
  },
};
