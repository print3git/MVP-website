"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const logger_js_1 = __importDefault(require("../logger.js"));
const db_1 = require("../db");
const env_1 = require("../env");
const { STRIPE_SECRET_KEY } = (0, env_1.getEnv)();
const realStripe = new stripe_1.default(STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});
const stripe = (0, env_1.isTest)()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;
const router = express_1.default.Router();
router.post(
  "/api/webhook/stripe",
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
      const jobId = metadata.jobId;
      const s3Key = metadata.s3Key;
      try {
        await (0, db_1.upsertOrderPaid)({
          userId,
          orderId,
          intentId: pi.id,
          amountCents: amount,
          currency: pi.currency,
          email,
          quantity: qty ? Number(qty) : undefined,
          modelUrl,
          jobId,
          s3Key,
        });
        if (jobId && s3Key) {
          await (0, db_1.linkModelToJob)(jobId, s3Key);
        }
      } catch (err) {
        logger_js_1.default.error("stripe_webhook_error", err);
        res.status(500).json({ error: "server_error" });
        return;
      }
      res.json({ ok: true });
      return;
    }
    res.json({ received: true });
  },
);
exports.default = router;
