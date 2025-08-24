const createMock = jest.fn(async (_args: any, _opts?: any) => ({ id: "cs_test_123" }));

class Stripe {
  checkout = { sessions: { create: createMock } } as any;
  constructor(_key: string, _opts?: any) {}
  static __mocks = { createMock };
}

export default Stripe;

