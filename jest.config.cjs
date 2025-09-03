let config;
try {
  require.resolve("ts-jest");
  config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>"],
    transform: {
      "^.+\\.tsx?$": [
        "ts-jest",
        { tsconfig: "tsconfig.json", diagnostics: false },
      ],
    },
    moduleFileExtensions: ["ts", "tsx", "js", "json"],
    passWithNoTests: true,
  };
} catch {
  config = require("./jest.config.offline.cjs");
}

module.exports = config;
