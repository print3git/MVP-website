const path = require("path");

module.exports = {
  displayName: "backend",
  rootDir: path.resolve(__dirname, "../.."),
  testMatch: ["<rootDir>/tests/backend/**/?(*.)+(test).[jt]s?(x)"],
  testEnvironment: "node",
  maxWorkers: 2,
  testTimeout: 30000,
  reporters: [
    "default",
    [
      "jest-junit",
      { outputDirectory: "tests/.artifacts", outputName: "backend-junit.xml" },
    ],
  ],
  coverageDirectory: "coverage/backend",
  coverageThreshold: {
    global: { lines: 80, branches: 80 },
  },
};
