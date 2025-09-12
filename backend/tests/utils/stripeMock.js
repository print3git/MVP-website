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
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      return Stripe.webhooks.constructEvent(payload, signature, secret);
    },
  },
};

module.exports = { stripe };
