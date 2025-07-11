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
const mail_1 = require("../../mail");
exports.orders = new Map();
const secretKey =
  process.env.NODE_ENV === "production"
    ? process.env.STRIPE_LIVE_KEY
    : process.env.STRIPE_TEST_KEY || "sk_test";
const stripe = new stripe_1.default(secretKey);
const router = express_1.default.Router();
router.post("/api/checkout", async (req, res) => {
  const { slug, email } = req.body;
  if (!slug || !email) return res.status(400).json({ error: "missing fields" });
  try {
    const session = await stripe.checkout.sessions.create({
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
    });
    exports.orders.set(session.id, { slug, email, paid: false });
    res.json({ checkoutUrl: session.url });
  } catch (_err) {
    res.status(500).json({ error: "Failed to create session" });
  }
});
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
    } catch (_err) {
      return res.status(400).send("Webhook Error");
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const order = exports.orders.get(session.id);
      if (order && !order.paid) {
        order.paid = true;
        const link = `https://huggingface.co/spaces/print2/Sparc3D/resolve/main/output/${order.slug}.glb`;
        await (0, mail_1.sendMail)(order.email, "Your model is ready", link);
      }
    }
    res.json({ received: true });
  },
);
exports.default = router;
