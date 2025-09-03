import { Router, type Request, type Response } from "express";
import { authRequired } from "../lib/auth";
import logger from "../logger";
import { capture } from "../lib/logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db");

const router = Router();

router.get("/credits", authRequired, async (req: Request, res: Response) => {
  try {
    const credit = await db.getSaleCredit((req as any).user.id);
    logger.info("credit_fetched", { userId: (req as any).user.id, credit });
    res.json({ credit });
  } catch (err) {
    logger.error("credit_fetch_failed", { userId: (req as any).user.id });
    capture(err);
    res.status(500).json({ error: "Failed to fetch credit" });
  }
});

router.post(
  "/credits/redeem",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const amount = Number(req.body.amount_cents) || 0;
      const credit = await db.adjustSaleCredit((req as any).user.id, -amount);
      logger.info("credit_redeemed", {
        userId: (req as any).user.id,
        amount,
        credit,
      });
      res.json({ credit });
    } catch (err) {
      logger.error("credit_redeem_failed", {
        userId: (req as any).user.id,
        amount: Number(req.body.amount_cents) || 0,
      });
      capture(err);
      res.status(500).json({ error: "Failed to redeem credit" });
    }
  },
);

export default router;
