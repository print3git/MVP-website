import express, { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import db from "../../db.js";
import { enqueuePrint } from "../../queue/printQueue.js";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue.js";
import logger from "../../logger.js";
import { isTest } from "../../env.js";
import { getEnv as getEnvVar } from "../../../utils/getEnv.js";

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
    if (!sig) {
      logger.warn("Stripe webhook missing signature");
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
      logger.warn("Stripe webhook signature verification failed", err as Error);
      res.status(400).json({ error: "invalid_signature" });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.query("UPDATE orders SET status=$1 WHERE session_id=$2", [
        "paid",
        session.id,
      ]);
      const jobId = session.metadata?.["jobId"];
      if (jobId) {
        await enqueueDbPrint(jobId, session.id, {}, null, null);
        enqueuePrint(jobId);
      }
    }

    res.status(200).json({ received: true });
  },
);

export default router;
