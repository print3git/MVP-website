const stripe = {
  checkout: {
    sessions: {
      create: async () => ({ id: "sess", url: "/checkout" }),
    },
  },
  billingPortal: {
    sessions: {
      create: async () => ({ url: "/portal" }),
    },
  },
  webhooks: {
    constructEvent: () => ({}),
  },
};

module.exports = { stripe };
