const { getEnv } = require("../../utils/getEnv");

describe("getEnv", () => {
  const KEY = "TEST_ENV_VAR";

  afterEach(() => {
    delete process.env[KEY];
  });

  test("returns the variable when set", () => {
    process.env[KEY] = "value";
    expect(getEnv(KEY)).toBe("value");
  });

  test("returns default when missing", () => {
    expect(getEnv(KEY, { default: "def" })).toBe("def");
  });

  test("returns undefined when missing and not required", () => {
    expect(getEnv(KEY)).toBeUndefined();
  });

  test("throws when required and missing", () => {
    expect(() => getEnv(KEY, { required: true })).toThrow();
  });
});
