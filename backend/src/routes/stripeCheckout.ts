import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { getEnv, isTest } from "../env";

const router = Router();

const { STRIPE_SECRET_KEY } = getEnv();
const realStripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-06-30.basil",
});
const stripe = isTest()
  ? require("../../tests/utils/stripeMock").stripe
  : realStripe;

router.post(
  "/create-checkout-session",
  async (_req: Request, res: Response) => {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Item" },
              unit_amount: 100,
            },
            quantity: 1,
          },
        ],
        success_url: process.env.FRONTEND_SUCCESS_URL as string,
        cancel_url: process.env.FRONTEND_CANCEL_URL as string,
      });

      res.json({ id: session.id });
    } catch (err) {
      res.status(500).json({ error: "Failed to create session" });
    }
  },
);

export default router;
