import { Router } from "express";
import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import Stripe from "stripe";
import db from "../../../db";

const router = Router();
const stripe = new Stripe(process.env["STRIPE_KEY"] as string, {
  apiVersion: "2025-06-30.basil",
});

interface CheckoutSessionBody {
  price: number;
  qty?: number;
  metadata?: Record<string, string>;
  userId?: string;
}

router.post(
  "/api/create-checkout-session",
  async (
    req: ExpressRequest<unknown, unknown, CheckoutSessionBody>,
    res: ExpressResponse,
    next: NextFunction,
  ) => {
  try {
    const { price, qty = 1, metadata = {}, userId } = req.body;

    let unitAmount = price;
    if (userId) {
      const { rows } = await db.query(
        "SELECT COUNT(*) FROM orders WHERE user_id=$1",
        [userId],
      );
      const orderCount = parseInt((rows[0] as any).count, 10) || 0;
      if (orderCount === 0) {
        unitAmount = Math.floor(unitAmount * 0.9);
      }
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: { name: "Print Job" },
          },
          quantity: qty,
        },
      ],
      metadata,
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    await db.query("INSERT INTO orders(session_id,status) VALUES($1,$2)", [
      session.id,
      "created",
    ]);
    res.json({ id: session.id, url: session.url });
  } catch (err: any) {
    next(err);
  }
});

export default router;
