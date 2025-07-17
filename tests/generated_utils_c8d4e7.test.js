const { getEnv } = require("../backend/utils/getEnv.js");

describe("generated getEnv", () => {
  const KEY = "TEST_VAR";
  afterEach(() => {
    delete process.env[KEY];
  });

  for (let i = 0; i < 50; i++) {
    test(`returns value when set ${i}`, () => {
      process.env[KEY] = `value${i}`;
      expect(getEnv(KEY)).toBe(`value${i}`);
    });
  }

  for (let i = 0; i < 50; i++) {
    test(`returns default when missing ${i}`, () => {
      expect(getEnv(KEY, { defaultValue: `def${i}` })).toBe(`def${i}`);
    });
  }

  for (let i = 0; i < 50; i++) {
    test(`throws when required and missing ${i}`, () => {
      expect(() => getEnv(KEY, { required: true })).toThrow(
        `Environment variable ${KEY} is required`,
      );
    });
  }

  for (let i = 0; i < 50; i++) {
    test(`uses default when empty ${i}`, () => {
      process.env[KEY] = "";
      expect(getEnv(KEY, { defaultValue: `d${i}` })).toBe(`d${i}`);
    });
  }
});
