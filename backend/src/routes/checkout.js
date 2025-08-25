"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.orders = void 0;
const express_1 = __importDefault(require("express"));
const stripe_1 = __importDefault(require("stripe"));
const pricing_1 = require("../pricing");
exports.orders = new Map();
const secretKey =
  process.env.NODE_ENV === "production"
    ? process.env.STRIPE_LIVE_KEY || process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_TEST_KEY || process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("Stripe key not configured");
}
const stripe = new stripe_1.default(secretKey, { apiVersion: "2025-06-30.basil" });
const router = express_1.default.Router();
router.orders = exports.orders;
router.post("/api/checkout", async (req, res, next) => {
  try {
    const { slug, email } = req.body;
    if (!slug || !email) {
      return res.status(400).json({ error: "missing fields" });
    }
    const sessionParams = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: pricing_1.PRODUCT.currency,
            product_data: { name: pricing_1.PRODUCT.name },
            unit_amount: pricing_1.PRODUCT.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: { slug, email },
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel`,
    };
    const session = await stripe.checkout.sessions.create(sessionParams);
    exports.orders.set(session.id, { slug, email, paid: false });
    res.json({ checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
});
exports.default = router;
