let config;
try {
  require.resolve("ts-jest");
  const babelConfig = require("./babel.config.js");
  const babelJestConfig = {
    ...babelConfig,
    presets: [...(babelConfig.presets || []), "babel-preset-current-node-syntax"],
  };
  config = {
    testEnvironment: "node",
    roots: ["<rootDir>"],
    transform: {
      "^.+\\.tsx?$": [
        "ts-jest",
        { tsconfig: "tsconfig.json", diagnostics: false },
      ],
      "^.+\\.jsx?$": ["babel-jest", babelJestConfig],
    },
    moduleFileExtensions: ["ts", "tsx", "js", "json"],
    passWithNoTests: false,
  };
} catch {
  config = require("./jest.config.offline.cjs");
}

module.exports = config;
