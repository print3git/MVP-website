const setup = () => {
  jest.resetModules();
  jest.mock("stripe");
  return require("stripe");
};

describe("Stripe mock diagnostics", () => {
  test("stripe is jest mock", () => {
    const Stripe = setup();
    expect(jest.isMockFunction(Stripe)).toBe(true);
  });

  test("has mockImplementation", () => {
    const Stripe = setup();
    expect(typeof Stripe.mockImplementation).toBe("function");
  });

  test("default sessions.create resolves id", async () => {
    const Stripe = setup();
    const s = new Stripe("key");
    await expect(s.checkout.sessions.create({})).resolves.toEqual({
      id: "cs_test_123",
    });
  });

  test("createMock tracks calls", async () => {
    const Stripe = setup();
    const s = new Stripe("key");
    await s.checkout.sessions.create({});
    expect(Stripe.__mocks.createMock).toHaveBeenCalled();
  });

  test("mockImplementation overrides instance", () => {
    const Stripe = setup();
    const custom = { foo: 1 };
    Stripe.mockImplementation(() => custom);
    expect(new Stripe("key")).toBe(custom);
  });

  test("mockImplementation can change", () => {
    const Stripe = setup();
    Stripe.mockImplementation(() => ({ bar: 2 }));
    expect((new Stripe("k") as any).bar).toBe(2);
    Stripe.mockImplementation(() => ({ baz: 3 }));
    expect((new Stripe("k") as any).baz).toBe(3);
  });

  test("constructor calls are tracked", () => {
    const Stripe = setup();
    new Stripe("a");
    new Stripe("b");
    expect(Stripe).toHaveBeenCalledTimes(2);
  });

  test("resetModules yields fresh mock", () => {
    const first = setup();
    const second = setup();
    expect(second).not.toBe(first);
  });

  test("mock remains after requiring server", () => {
    const Stripe = setup();
    require("../server");
    const Stripe2 = require("stripe");
    expect(jest.isMockFunction(Stripe2)).toBe(true);
  });

  test("__mocks exposes createMock", () => {
    const Stripe = setup();
    expect(typeof Stripe.__mocks.createMock).toBe("function");
  });

  test("custom mockImplementation used by server", () => {
    const Stripe = setup();
    const custom = { webhooks: {} };
    Stripe.mockImplementation(() => custom);
    require("../server");
    expect(Stripe).toHaveBeenCalled();
    expect(new Stripe("x")).toBe(custom);
  });
});
