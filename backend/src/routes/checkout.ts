import express from "express";
import type { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { PRODUCT } from "../pricing";
import { sendMail } from "../../mail";

export interface Order {
  /** S3 object key (without `.glb`) returned from `storeGlb` */
  slug: string;
  email: string;
  paid?: boolean;
}

export const orders = new Map<string, Order>();

const secretKey =
  process.env["NODE_ENV"] === "production"
    ? process.env["STRIPE_LIVE_KEY"] || process.env["STRIPE_SECRET_KEY"]
    : process.env["STRIPE_TEST_KEY"] || process.env["STRIPE_SECRET_KEY"];
if (!secretKey) {
  throw new Error("Stripe key not configured");
}
const stripe = new Stripe(secretKey, { apiVersion: "2025-06-30.basil" });

const router = express.Router();
(router as any).orders = orders;

router.post(
  "/api/checkout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug, email } = req.body as Order;
      if (!slug || !email) {
        return res.status(400).json({ error: "missing fields" });
      }
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: PRODUCT.currency,
              product_data: { name: PRODUCT.name },
              unit_amount: PRODUCT.priceCents,
            },
            quantity: 1,
          },
        ],
        metadata: { slug, email },
        success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/cancel`,
      };
      const session = await stripe.checkout.sessions.create(sessionParams);
      orders.set(session.id, { slug, email, paid: false });
      res.json({ checkoutUrl: session.url });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction) => {
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
      }
      res.sendStatus(200);
    } catch (err) {
      // signature errors should return 400
      if (err instanceof Error && err.message.includes("Webhook Error")) {
        return res.sendStatus(400);
      }
      next(err);
    }
  },
);

export default router;
