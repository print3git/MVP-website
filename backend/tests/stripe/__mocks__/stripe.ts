const createMock = jest.fn(async (_args: any, _opts?: any) => ({
  id: "cs_test_123",
}));

const Stripe = jest.fn().mockImplementation((_key: string, _opts?: any) => ({
  checkout: { sessions: { create: createMock } },
  webhooks: {
    constructEvent: jest.fn(),
    generateTestHeaderString: jest.fn(() => "test"),
  },
}));

(Stripe as any).__mocks = { createMock };
(Stripe as any).webhooks = {
  generateTestHeaderString: jest.fn(() => "test"),
};

export = Stripe;
