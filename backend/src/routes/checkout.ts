import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
import { PRODUCT } from "../pricing";

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
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { slug, email } = req.body as Order;
      if (!slug || !email) {
        res.status(400).json({ error: "missing fields" });
        return;
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

export default router;
