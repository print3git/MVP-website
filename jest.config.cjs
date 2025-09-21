let config;
try {
  require.resolve("ts-jest");
  const babelConfig = require("./babel.config.js");
  const babelJestConfig = {
    ...babelConfig,
    presets: [
      ...(babelConfig.presets || []),
      "babel-preset-current-node-syntax",
    ],
  };
  config = {
    testEnvironment: "jsdom",
    roots: ["<rootDir>"],
    transform: {
      "^.+\\.tsx?$": [
        "ts-jest",
        { tsconfig: "tsconfig.json", diagnostics: false },
      ],
      "^.+\\.jsx?$": ["babel-jest", babelJestConfig],
      "^.+\\.mjs$": [
        "babel-jest",
        { plugins: ["@babel/plugin-transform-modules-commonjs"] },
      ],
    },
    moduleFileExtensions: ["ts", "tsx", "js", "json", "mjs"],
    moduleNameMapper: {
      "^yaml$": "<rootDir>/node_modules/yaml/dist/index.js",
    },
    testMatch: [
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.spec.js",
      "**/*.spec.jsx",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.test.js",
      "**/*.test.jsx",
      "**/*.test.*.ts",
      "**/*.test.*.tsx",
      "**/*.test.*.js",
      "**/*.test.*.jsx",
    ],
    passWithNoTests: false,

    // 🔑 Coverage settings for Step 2
    collectCoverage: true,
    coverageReporters: ["lcov", "text", "json-summary"],
  };
} catch {
  config = require("./jest.config.offline.cjs");
}

module.exports = config;
