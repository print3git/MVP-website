const path = require("path");

describe("babel config", () => {
  test("does not throw when optional plugin is missing", () => {
    jest.resetModules();
    jest.mock(
      "@babel/plugin-syntax-typescript",
      () => {
        throw new Error("missing");
      },
      { virtual: true },
    );
    expect(() => require(path.join("..", "babel.config.js"))).not.toThrow();
  });
});
