import express, {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
import db from "../../db.js";
import { enqueuePrint } from "../../queue/printQueue.js";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue.js";

const router = Router();
const stripe = new Stripe(process.env["STRIPE_KEY"] as string, {
  apiVersion: "2025-06-30.basil",
});

router.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (
    req: Request<any, any, Buffer>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env["STRIPE_WEBHOOK_SECRET"] as string,
      );
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
      res.sendStatus(200);
      return;
    } catch (err: any) {
      if (err.message) {
        console.error("Webhook Error:", err.message);
        res.status(400).send("Webhook Error");
        return;
      }
      next(err);
    }
  },
);

export default router;
