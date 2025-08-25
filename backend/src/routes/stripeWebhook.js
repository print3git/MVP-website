"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const checkout_1 = require("./checkout");
const mail_1 = require("../../mail");
const secretKey =
  process.env.NODE_ENV === "production"
    ? process.env.STRIPE_LIVE_KEY || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Stripe key not configured");
}
const stripe = new stripe_1.default(secretKey, { apiVersion: "2025-06-30.basil" });
const router = express_1.default.Router();
router.post(
  "/stripe/webhook",
  express_1.default.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const sig = req.headers["stripe-signature"];
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || "",
      );
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const order = checkout_1.orders.get(session.id);
        if (order && !order.paid) {
          order.paid = true;
          const link = process.env.CLOUDFRONT_MODEL_DOMAIN
            ? `https://${process.env.CLOUDFRONT_MODEL_DOMAIN}/${order.slug}.glb`
            : order.slug;
          await (0, mail_1.sendMail)(order.email, "Your model is ready", link);
        }
      }
      res.sendStatus(200);
    } catch (err) {
      if (err && err.message && err.message.includes("Webhook Error")) {
        return res.sendStatus(400);
      }
      next(err);
    }
  },
);
exports.default = router;
