const { stripAnsi } = require("../../src/utils/stripAnsi.js");

describe("stripAnsi", () => {
  test("removes basic color codes", () => {
    const input = "\u001b[31mred\u001b[0m";
    expect(stripAnsi(input)).toBe("red");
  });

  test("handles nested sequences", () => {
    const input = "\u001b[1m\u001b[32mgreen\u001b[0m";
    expect(stripAnsi(input)).toBe("green");
  });

  test("removes cursor commands", () => {
    const input = "line\u001b[2K";
    expect(stripAnsi(input)).toBe("line");
  });
});
