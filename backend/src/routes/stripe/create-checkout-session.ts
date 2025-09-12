import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import db from "../../db"; // imported for tests
import { isTest } from "../../env";
import logger from "../../logger";
import { capture } from "../../lib/logger";
import { getEnv as getEnvVar } from "../../../utils/getEnv";

interface Item {
  price: string;
  quantity: number;
}

interface CheckoutBody {
  items?: Item[];
  price?: number;
  allowPromotionCodes?: boolean;
  metadata?: Record<string, string>;
  customer_email?: string;
  requiresShipping?: boolean;
  currency?: string;
  idempotencyKey?: string;
}

const router = Router();

router.post(
  "/api/checkout/create",
  async (req: Request<{}, any, CheckoutBody>, res: Response) => {
    const {
      items,
      price,
      allowPromotionCodes,
      metadata,
      customer_email,
      requiresShipping,
      currency = "usd",
      idempotencyKey,
    } = req.body;

    const stripeKey = getEnvVar("STRIPE_SECRET_KEY");
    const successUrl = getEnvVar("FRONTEND_SUCCESS_URL");
    const cancelUrl = getEnvVar("FRONTEND_CANCEL_URL");

    if (!stripeKey) {
      return res.status(500).json({ error: "STRIPE_SECRET_KEY missing" });
    }
    if (!successUrl) {
      return res.status(500).json({ error: "FRONTEND_SUCCESS_URL missing" });
    }
    if (!cancelUrl) {
      return res.status(500).json({ error: "FRONTEND_CANCEL_URL missing" });
    }

    const stripe = isTest()
      ? require("../../../tests/utils/stripeMock").stripe
      : new Stripe(stripeKey, { apiVersion: "2022-11-15" });

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (typeof price === "number") {
      lineItems = [
        {
          price_data: { currency, unit_amount: price },
          quantity: 1,
        },
      ];
    } else {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "bad_request" });
      }

      for (const item of items) {
        if (!item.price) {
          return res.status(400).json({ error: "bad_request" });
        }
        if (
          typeof item.quantity !== "number" ||
          item.quantity < 1 ||
          item.quantity > 99
        ) {
          return res.status(400).json({ error: "bad_request" });
        }
      }

      lineItems = items.map((i) => ({ price: i.price, quantity: i.quantity }));
    }

    const params: Stripe.Checkout.SessionCreateParams & { currency?: string } =
      {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
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

    logger.info("create_checkout_session", {
      items,
      price,
      allowPromotionCodes,
      metadata,
      customer_email,
      requiresShipping,
      currency,
      idempotencyKey,
    });

    try {
      const session = await stripe.checkout.sessions.create(
        params,
        idempotencyKey ? { idempotencyKey } : undefined,
      );
      res.json({ id: session.id });
    } catch (err) {
      logger.error("create_checkout_session_failed", err as Error);
      capture(err);
      res.status(500).json({ error: "stripe_error" });
    }
  },
);

export default router;
