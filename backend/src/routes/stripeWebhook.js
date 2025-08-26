"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Stripe key not configured");
}
const stripe = new stripe_1.default(secretKey, {
  apiVersion: "2025-06-30.basil",
});
const router = express_1.default.Router();
router.post(
  "/api/stripe/webhook",
  express_1.default.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || "",
      );
    } catch (_a) {
      res.status(400).json({ error: "invalid_signature" });
      return;
    }
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const processed = await (0, db_1.markPaymentProcessed)(pi.id);
      if (!processed) {
        res.json({ ok: true });
        return;
      }
      const amount = pi.amount_received ?? pi.amount ?? 0;
      const email =
        (pi.charges &&
          pi.charges.data &&
          pi.charges.data[0] &&
          pi.charges.data[0].receipt_email) ||
        pi.receipt_email;
      const metadata = pi.metadata || {};
      const userId = metadata.userId;
      const orderId = metadata.orderId;
      const qty = metadata.qty;
      const modelUrl = metadata.modelUrl;
      await (0, db_1.upsertOrderPaid)({
        userId,
        orderId,
        intentId: pi.id,
        amountCents: amount,
        currency: pi.currency,
        email,
        quantity: qty ? Number(qty) : undefined,
        modelUrl,
      });
      res.json({ ok: true });
      return;
    }
    res.json({ received: true });
  },
);
exports.default = router;
