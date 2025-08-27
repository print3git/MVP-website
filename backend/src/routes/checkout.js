"use strict";
const express = require("express");
const Stripe = require("stripe");
const { getEnv, isTest } = require("../env");
const logger = require("../logger.js");
const { capture } = require("../lib/logger");

const router = express.Router();

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
      logger.warn("checkout_create_bad_request", { reason: "missing_items" });
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const normalized = [];
    for (const item of items) {
      if (typeof item.price !== "string") {
        logger.warn("checkout_create_bad_request", { reason: "invalid_item" });
        res.status(400).json({ error: "bad_request" });
        return;
      }
      const qty = item.quantity ?? 1;
      if (typeof qty !== "number" || qty < 1 || qty > 99) {
        logger.warn("checkout_create_bad_request", {
          reason: "invalid_quantity",
        });
        res.status(400).json({ error: "bad_request" });
        return;
      }
      normalized.push({ price: item.price, quantity: qty });
    }
    const realStripe = new Stripe(secretKey, {
      apiVersion: "2025-06-30.basil",
    });
    const stripe = isTest()
      ? require("../../tests/utils/stripeMock").stripe
      : realStripe;
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
        { idempotencyKey: idempotencyKey || undefined },
      );
      logger.info("checkout_session_created", { sessionId: session.id });
      res.status(200).json({ id: session.id });
    } catch (err) {
      logger.error("stripe_checkout_session_failed");
      capture(err);
      res.status(502).json({ error: "stripe_error" });
    }
  } catch (err) {
    logger.error("checkout_create_failed");
    capture(err);
    res.status(400).json({ error: "bad_request" });
  }
});

module.exports = router;
module.exports.default = router;
