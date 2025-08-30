const { Router } = require("express");
const Stripe = require("stripe");
const { getEnv, isTest } = require("../env");

const PRICE_MAP = {
  print_multi: 3999,
  print_single: 2999,
};

const { STRIPE_SECRET_KEY } = getEnv();
const realStripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;

const router = Router();

router.post("/checkout/create", async (req, res) => {
  try {
    const { items, currency = "usd", customer_email, metadata } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "bad_request" });
    }

    let amount = 0;
    let qtyTotal = 0;
    for (const item of items) {
      if (typeof item.price !== "string" || typeof item.quantity !== "number") {
        return res.status(400).json({ error: "bad_request" });
      }
      const unit = PRICE_MAP[item.price];
      if (!unit || item.quantity < 1 || item.quantity > 99) {
        return res.status(400).json({ error: "bad_request" });
      }
      amount += unit * item.quantity;
      qtyTotal += item.quantity;
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: { ...metadata, qtyTotal, source: "custom_checkout" },
        receipt_email: customer_email,
      });
      res.json({ clientSecret: intent.client_secret });
    } catch (_err) {
      res.status(502).json({ error: "stripe_error" });
    }
  } catch (_err) {
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
module.exports.default = router;
