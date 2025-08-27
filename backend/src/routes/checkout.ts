import { Router } from "express";
import Stripe from "stripe";
import { getEnv } from "../env";

const router = Router();

router.post("/checkout/create", async (req, res) => {
  try {
    const { STRIPE_SECRET_KEY: secretKey } = getEnv();
    const successUrl = process.env.FRONTEND_SUCCESS_URL;
    const cancelUrl = process.env.FRONTEND_CANCEL_URL;

    if (!secretKey || !successUrl || !cancelUrl) {
      res.status(500).json({ error: "server_misconfig" });
      return;
    }

    const {
      items,
      allowPromotionCodes,
      requiresShipping,
      customerEmail,
      customer_email,
      metadata,
      currency,
      idempotencyKey,
    } = req.body || {};

    const email = customerEmail ?? customer_email;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "bad_request" });
      return;
    }

    const normalized: { price: string; quantity: number }[] = [];
    for (const item of items) {
      if (typeof item.price !== "string") {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      const qty = item.quantity ?? 1;
      if (typeof qty !== "number" || qty < 1 || qty > 99) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      normalized.push({ price: item.price, quantity: qty });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2025-06-30.basil" });

    const metadataSanitized =
      metadata &&
      Object.fromEntries(
        Object.entries(metadata).map(([k, v]) => [k, String(v)]),
      );

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          payment_method_types: ["card"],
          line_items: normalized,
          success_url: successUrl,
          cancel_url: cancelUrl,
          allow_promotion_codes: !!allowPromotionCodes,
          customer_email: email || undefined,
          shipping_address_collection: requiresShipping
            ? { allowed_countries: ["US", "GB", "CA", "AU", "EU"] }
            : undefined,
          currency: currency || "usd",
          metadata: metadataSanitized || undefined,
        },
        {
          idempotencyKey: idempotencyKey || undefined,
        },
      );
      res.status(200).json({ id: session.id });
    } catch {
      res.status(502).json({ error: "stripe_error" });
    }
  } catch {
    res.status(400).json({ error: "bad_request" });
  }
});

export default router;
