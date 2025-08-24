const generateTitle = require("../../utils/generateTitle");

describe("generateTitle", () => {
  test('returns "Untitled Model" for non-string input', () => {
    expect(generateTitle(null)).toBe("Untitled Model");
    expect(generateTitle(123)).toBe("Untitled Model");
  });

  test('returns "Untitled Model" when no words', () => {
    expect(generateTitle("!!! ???")).toBe("Untitled Model");
  });

  test("deduplicates and limits to three words", () => {
    const result = generateTitle("cat cat dog fish bird");
    expect(result).toBe("Cat Dog Fish");
  });

  test("capitalizes and trims words", () => {
    expect(generateTitle(" hello world ")).toBe("Hello World");
  });

  test("ignores punctuation and numbers", () => {
    expect(generateTitle("foo123 bar! baz?")).toBe("Foo123 Bar Baz");
  });
});
