const Stripe = require("stripe");

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
    constructEvent: (payload, signature) => {
      return Stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    },
  },
};

module.exports = { stripe };
