import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import logger from "../logger.js";
import { getEnv, isTest } from "../env";
import { capture } from "../lib/logger";
import { getEnv as getEnvVar } from "../../utils/getEnv.js";

const router = Router();

const { STRIPE_SECRET_KEY } = getEnv();
let successUrl: string;
let cancelUrl: string;
try {
  successUrl = getEnvVar("FRONTEND_SUCCESS_URL", { required: true });
  cancelUrl = getEnvVar("FRONTEND_CANCEL_URL", { required: true });
} catch {
  logger.error("Missing FRONTEND_SUCCESS_URL or FRONTEND_CANCEL_URL");
  process.exit(1);
}
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
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      logger.info("stripe_checkout_session_created", { sessionId: session.id });
      res.json({ id: session.id });
    } catch (err) {
      logger.error("stripe_checkout_session_failed");
      capture(err);
      res.status(500).json({ error: "Failed to create session" });
    }
  },
);

export default router;
