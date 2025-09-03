import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { getEnv } from "../env";
import logger from "../logger";
import { capture } from "../lib/logger";

interface Item {
  price: string;
  quantity: number;
}

interface CheckoutBody {
  items?: Item[];
  currency?: string;
  customer_email?: string;
  metadata?: Record<string, any>;
}

const PRICE_MAP: Record<string, number> = {
  print_multi: 3999,
  print_single: 2999,
};

const { STRIPE_SECRET_KEY } = getEnv();
const realStripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;

const router = Router();

router.post(
  "/checkout/create",
  async (req: Request<{}, any, CheckoutBody>, res: Response) => {
    try {
      const { items, currency = "usd", customer_email, metadata } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        logger.warn("checkout_create_bad_request", { reason: "missing_items" });
        return res.status(400).json({ error: "bad_request" });
      }

      let amount = 0;
      let qtyTotal = 0;
      for (const item of items) {
        if (
          typeof item.price !== "string" ||
          typeof item.quantity !== "number"
        ) {
          logger.warn("checkout_create_bad_request", {
            reason: "invalid_item",
          });
          return res.status(400).json({ error: "bad_request" });
        }
        const unit = PRICE_MAP[item.price];
        if (!unit || item.quantity < 1 || item.quantity > 99) {
          logger.warn("checkout_create_bad_request", {
            reason: "invalid_quantity",
          });
          return res.status(400).json({ error: "bad_request" });
        }
        amount += unit * item.quantity;
        qtyTotal += item.quantity;
      }

      try {
        const intent = await stripe.paymentIntents.create({
          amount,
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: { ...metadata, qtyTotal, source: "custom_checkout" },
          receipt_email: customer_email,
        });
        logger.info("payment_intent_created", { amount, currency, qtyTotal });
        res.json({ clientSecret: intent.client_secret });
      } catch (err) {
        logger.error("stripe_payment_intent_failed");
        capture(err);
        res.status(502).json({ error: "stripe_error" });
      }
    } catch (err) {
      logger.error("checkout_create_failed");
      capture(err);
      res.status(500).json({ error: "internal_error" });
    }
  },
);

export default router;
