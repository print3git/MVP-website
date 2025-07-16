import express, { Router } from "express";
import Stripe from "stripe";
import db from "../../db";
import { enqueuePrint } from "../../queue/printQueue";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_KEY as string, {
  apiVersion: "2022-11-15",
});

router.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req, res, next) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        await db.query("UPDATE orders SET status=$1 WHERE session_id=$2", [
          "paid",
          session.id,
        ]);
        if (session.metadata?.jobId) {
          await enqueueDbPrint(
            session.metadata.jobId,
            session.id,
            {},
            null,
            null,
          );
          enqueuePrint(session.metadata.jobId);
        }
      }
      res.sendStatus(200);
    } catch (err: any) {
      if (err.message) {
        console.error("Webhook Error:", err.message);
        return res.status(400).send("Webhook Error");
      }
      next(err);
    }
  },
);

export default router;
