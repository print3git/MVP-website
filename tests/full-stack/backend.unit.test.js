const { getEnv } = require("../../backend/utils/getEnv.js");

describe("getEnv", () => {
  afterEach(() => {
    delete process.env.TEST_VAR;
  });

  test("returns existing value", () => {
    process.env.TEST_VAR = "abc";
    expect(getEnv("TEST_VAR")).toBe("abc");
  });

  test("returns default when missing", () => {
    expect(getEnv("TEST_VAR", { default: "def" })).toBe("def");
  });

  test("throws when required missing", () => {
    expect(() => getEnv("TEST_VAR", { required: true })).toThrow(
      /Environment variable TEST_VAR is required/,
    );
  });
});
