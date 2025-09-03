const createMock = jest.fn(async (_args, _opts) => ({
  id: "cs_test_123",
}));

const Stripe = jest.fn().mockImplementation((_key, _opts) => ({
  checkout: { sessions: { create: createMock } },
  webhooks: {
    constructEvent: jest.fn(),
    generateTestHeaderString: jest.fn(() => "test"),
  },
}));

Stripe.__mocks = { createMock };
Stripe.webhooks = {
  generateTestHeaderString: jest.fn(() => "test"),
};

module.exports = Stripe;
