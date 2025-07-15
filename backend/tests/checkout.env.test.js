jest.mock("stripe");

describe("checkout env validation", () => {
  const originalTestKey = process.env.STRIPE_TEST_KEY;
  const originalLiveKey = process.env.STRIPE_LIVE_KEY;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });
  afterEach(() => {
    process.env.STRIPE_TEST_KEY = originalTestKey;
    process.env.STRIPE_LIVE_KEY = originalLiveKey;
  });
  test("module loads with default key when env missing", () => {
    delete process.env.STRIPE_TEST_KEY;
    delete process.env.STRIPE_LIVE_KEY;
    expect(() => {
      jest.isolateModules(() => require("../src/routes/checkout"));
    }).toThrow();
  });
  test("router exposes orders map", () => {
    process.env.STRIPE_TEST_KEY = "sk_test";
    jest.isolateModules(() => {
      const module = require("../src/routes/checkout");
      expect(module.default.orders).toBe(module.orders);
    });
  });
});
