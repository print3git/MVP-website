const hasTsJest = (() => {
  try {
    require.resolve("ts-jest");
    return true;
  } catch {
    return false;
  }
})();

module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  ...(hasTsJest
    ? {
        preset: "ts-jest",
        transform: {
          "^.+\\.tsx?$": [
            "ts-jest",
            { tsconfig: "tsconfig.json", diagnostics: false },
          ],
        },
        moduleFileExtensions: ["ts", "tsx", "js", "json"],
      }
    : { moduleFileExtensions: ["js", "json"], transform: {} }),
  passWithNoTests: true,
};
