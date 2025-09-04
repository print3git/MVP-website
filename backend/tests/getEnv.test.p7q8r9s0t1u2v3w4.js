const getEnv = require("../utils/getEnv");

describe("getEnv", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  test("returns existing env variable", () => {
    process.env.MY_VAR = "value";
    expect(getEnv("MY_VAR")).toBe("value");
  });

  test("returns default when unset", () => {
    expect(getEnv("UNSET_VAR", { default: "fallback" })).toBe("fallback");
  });

  test("throws when required and missing", () => {
    expect(() => getEnv("MISSING", { required: true })).toThrow(
      "Environment variable MISSING is required",
    );
  });

  test("returns undefined when optional and missing", () => {
    expect(getEnv("OPTIONAL")).toBeUndefined();
  });
});
