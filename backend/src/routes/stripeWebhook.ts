import express from "express";
import Stripe from "stripe";
import logger from "../logger.js";
import { upsertOrderPaid, markPaymentProcessed, linkModelToJob } from "../db";
import { isTest } from "../env";
import { capture } from "../lib/logger";
import { getEnv as getBackendEnv, isTest } from "../env";
import { getEnv } from "../../utils/getEnv.js";


const { STRIPE_SECRET_KEY } = getBackendEnv();
const realStripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;

let stripeWebhookSecret: string;
try {
  stripeWebhookSecret = getEnv("STRIPE_WEBHOOK_SECRET", { required: true })!;
} catch (err) {
  logger.error((err as Error).message);
  process.exit(1);
}

const router = express.Router();

router.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        stripeWebhookSecret,
      );
    } catch {
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const processed = await markPaymentProcessed(pi.id);
      if (!processed) {
        res.json({ ok: true });
        return;
      }
      const amount = pi.amount_received ?? pi.amount ?? 0;
      const email =
        pi.charges?.data?.[0]?.receipt_email || (pi as any).receipt_email;
      const { userId, orderId, qty, modelUrl, jobId, s3Key } =
        pi.metadata || {};
      try {
        await upsertOrderPaid({
          userId,
          orderId,
          intentId: pi.id,
          amountCents: amount,
          currency: pi.currency,
          email,
          quantity: qty ? Number(qty) : undefined,
          modelUrl,
          jobId,
          s3Key,
        });
        if (jobId && s3Key) {
          await linkModelToJob(jobId, s3Key);
        }
      } catch (err) {
        logger.error("stripe_webhook_error", err);
        capture(err);
        res.status(500).json({ error: "server_error" });
        return;
      }
      res.json({ ok: true });
      return;
    }

    res.json({ received: true });
  },
);

export default router;
