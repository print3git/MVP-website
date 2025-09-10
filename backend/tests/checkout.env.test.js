jest.mock("stripe");

describe("checkout env validation", () => {
  const originalTestKey = process.env.STRIPE_SECRET_KEY;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = originalTestKey;
  });
  test("module loads with default key when env missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => {
      jest.isolateModules(() => require("../src/routes/checkout"));
    }).not.toThrow();
  });
  test("does not throw when all stripe keys are missing", () => {
    const secret = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => {
      jest.isolateModules(() => require("../src/routes/checkout"));
    }).not.toThrow();
    process.env.STRIPE_SECRET_KEY = secret;
  });
  test("router exposes orders map", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    jest.isolateModules(() => {
      const module = require("../src/routes/checkout");
      expect(module.default.orders).toBe(module.orders);
    });
  });
});
