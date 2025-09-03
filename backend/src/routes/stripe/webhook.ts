import express, { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import db from "../../db";
import { enqueuePrint } from "../../queue/printQueue";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue";
import logger from "../../logger";
import { capture } from "../../lib/logger";
import { isTest } from "../../env";
import { getEnv as getEnvVar } from "../../../utils/getEnv";

const router = Router();
let stripeKey: string;
let stripeWebhookSecret: string;
try {
  stripeKey = getEnvVar("STRIPE_KEY", { required: true })!;
  stripeWebhookSecret = getEnvVar("STRIPE_WEBHOOK_SECRET", { required: true })!;
} catch (err) {
  logger.error((err as Error).message);
  process.exit(1);
}

const realStripe = new Stripe(stripeKey, {
  apiVersion: "2022-11-15",
});
const stripe = isTest()
  ? require("../../../tests/utils/stripeMock").stripe
  : realStripe;

router.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request<any, any, Buffer>, res: Response): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!sig) {
      const err = new Error("stripe_webhook_missing_signature");
      logger.warn("stripe_webhook_missing_signature");
      capture(err);
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, stripeWebhookSecret);
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
