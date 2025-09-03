module.exports = {
  preset: "ts-jest/presets/default",
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
