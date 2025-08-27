import express, { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import db from "../../db.js";
import { enqueuePrint } from "../../queue/printQueue.js";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue.js";
import logger from "../../logger.js";
import { capture } from "../../lib/logger";
import { isTest } from "../../env.js";

const router = Router();
const realStripe = new Stripe(process.env["STRIPE_KEY"] as string, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../../tests/utils/stripeMock").stripe
  : realStripe;

router.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request<any, any, Buffer>, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !secret) {
      const err = new Error("stripe_webhook_missing_signature_or_secret");
      logger.warn("stripe_webhook_missing_signature_or_secret");
      capture(err);
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      logger.warn("stripe_webhook_signature_verification_failed", err as Error);
      capture(err);
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    logger.info("stripe_webhook_received", { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      try {
        await db.query("UPDATE orders SET status=$1 WHERE session_id=$2", [
          "paid",
          session.id,
        ]);
        logger.info("order_paid", { sessionId: session.id });
        const jobId = session.metadata?.["jobId"];
        if (jobId) {
          await enqueueDbPrint(jobId, session.id, {}, null, null);
          enqueuePrint(jobId);
          logger.info("print_enqueued", { jobId, sessionId: session.id });
        } else {
          logger.warn("stripe_webhook_missing_job_id", {
            sessionId: session.id,
          });
        }
      } catch (err) {
        logger.error("stripe_webhook_processing_failed", {
          sessionId: session.id,
        });
        capture(err);
        res.status(500).json({ error: "processing_failed" });
        return;
      }
    }

    logger.info("stripe_webhook_processed", { type: event.type });
    res.status(200).json({ received: true });
  },
);

export default router;
