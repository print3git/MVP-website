import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
import { orders } from "./checkout";
import { sendMail } from "../../mail.js";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db.js");

const secretKey =
  process.env["NODE_ENV"] === "production"
    ? process.env["STRIPE_LIVE_KEY"] || process.env["STRIPE_SECRET_KEY"]
    : process.env["STRIPE_TEST_KEY"] || process.env["STRIPE_SECRET_KEY"];
if (!secretKey) {
  throw new Error("Stripe key not configured");
}
const stripe = new Stripe(secretKey, { apiVersion: "2025-06-30.basil" });

const router = express.Router();

const handler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env["STRIPE_WEBHOOK_SECRET"] || "",
    );
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const order = orders.get(session.id);
      if (order && !order.paid) {
        order.paid = true;
        const domain = process.env["CLOUDFRONT_MODEL_DOMAIN"];
        const link = domain
          ? `https://${domain}/${order.slug}.glb`
          : order.slug;
        await sendMail(order.email, "Your model is ready", link);
      }
      if (session.metadata?.jobId) {
        await db.adjustSaleCredit("seller", 500);
      }
    }
    res.sendStatus(200);
    return;
  } catch (err) {
    if (err instanceof Error && err.message.includes("Webhook Error")) {
      res.sendStatus(400);
      return;
    }
    next(err);
  }
};

router.post("/stripe/webhook", express.raw({ type: "application/json" }), handler);
router.post("/api/webhook/stripe", express.raw({ type: "application/json" }), handler);

export default router;
