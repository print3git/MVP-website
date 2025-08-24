const { getEnv } = require("../src/lib/getEnv");

describe("getEnv utility", () => {
  const VAR = "TEST_ENV_VAR";
  afterEach(() => {
    delete process.env[VAR];
  });

  test("returns value when set", () => {
    process.env[VAR] = "value";
    expect(getEnv(VAR)).toBe("value");
  });

  test("returns default when unset", () => {
    expect(getEnv(VAR, { defaultValue: "def" })).toBe("def");
  });

  test("returns undefined when optional and unset", () => {
    expect(getEnv(VAR)).toBeUndefined();
  });

  test("throws when required and unset", () => {
    expect(() => getEnv(VAR, { required: true })).toThrow(
      `Environment variable ${VAR} is required`,
    );
  });
});
