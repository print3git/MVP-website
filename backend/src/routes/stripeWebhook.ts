import express, { type Request, type Response } from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});

const processedEvents = new Set<string>();

router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET as string,
      );
    } catch (err) {
      return res.status(400).send("Webhook signature verification failed");
    }

    if (processedEvents.has(event.id)) {
      return res.json({ received: true });
    }
    processedEvents.add(event.id);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("checkout.session.completed", session.id);
    }

    res.json({ received: true });
  },
);

export default router;
