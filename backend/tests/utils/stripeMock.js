const stripe = {
  checkout: {
    sessions: {
      create: async () => ({ id: "sess", url: "/checkout" }),
    },
  },
  webhooks: {
    constructEvent: () => ({}),
  },
};

module.exports = { stripe };
