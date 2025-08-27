import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import db from "../../db"; // imported for tests
import { isTest } from "../../env";

interface Item {
  price: string;
  quantity: number;
}

interface CheckoutBody {
  items?: Item[];
  allowPromotionCodes?: boolean;
  metadata?: Record<string, string>;
  customer_email?: string;
  requiresShipping?: boolean;
  currency?: string;
  idempotencyKey?: string;
}

const router = Router();
const realStripe = new Stripe(process.env.STRIPE_TEST_KEY as string, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../../tests/utils/stripeMock").stripe
  : realStripe;

router.post(
  "/api/checkout/create",
  async (req: Request<{}, any, CheckoutBody>, res: Response) => {
    const {
      items,
      allowPromotionCodes,
      metadata,
      customer_email,
      requiresShipping,
      currency = "usd",
      idempotencyKey,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "bad_request" });
    }

    for (const item of items) {
      if (!item.price) {
        return res.status(400).json({ error: "bad_request" });
      }
      if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 99) {
        return res.status(400).json({ error: "bad_request" });
      }
    }

    const params: Stripe.Checkout.SessionCreateParams & { currency?: string } = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: items.map((i) => ({ price: i.price, quantity: i.quantity })),
      success_url: process.env.FRONTEND_SUCCESS_URL as string,
      cancel_url: process.env.FRONTEND_CANCEL_URL as string,
      currency,
    };

    if (allowPromotionCodes) {
      params.allow_promotion_codes = true;
    }
    if (metadata) {
      params.metadata = metadata;
    }
    if (customer_email) {
      params.customer_email = customer_email;
    }
    if (requiresShipping) {
      params.shipping_address_collection = { allowed_countries: ["US"] };
    }

    try {
      const session = await stripe.checkout.sessions.create(
        params,
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      res.json({ id: session.id });
    } catch (err) {
      res.status(502).json({ error: "stripe_error" });
    }
  },
);

export default router;

