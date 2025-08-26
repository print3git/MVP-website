import { Router, type Request, type Response } from "express";
import { authRequired } from "../lib/auth";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db.js");

const router = Router();

router.get("/credits", authRequired, async (req: Request, res: Response) => {
  try {
    const credit = await db.getSaleCredit((req as any).user.id);
    res.json({ credit });
  } catch {
    res.status(500).json({ error: "Failed to fetch credit" });
  }
});

router.post(
  "/credits/redeem",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const amount = Number(req.body.amount_cents) || 0;
      const credit = await db.adjustSaleCredit(
        (req as any).user.id,
        -amount,
      );
      res.json({ credit });
    } catch {
      res.status(500).json({ error: "Failed to redeem credit" });
    }
  },
);

export default router;
