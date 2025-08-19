import express, {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import Stripe from "stripe";
import db from "../../db";
import { enqueuePrint } from "../../queue/printQueue";
import { enqueuePrint as enqueueDbPrint } from "../../queue/dbPrintQueue";

const router = Router();
const stripe = new Stripe(process.env["STRIPE_KEY"] as string, {
  apiVersion: "2025-06-30.basil",
});

router.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction) => {
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
        const jobId = session.metadata?.jobId;
        if (jobId) {
          await enqueueDbPrint(jobId, session.id, {}, null, null);
          enqueuePrint(jobId);
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
