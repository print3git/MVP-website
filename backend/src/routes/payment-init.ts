import { Router, type Request, type Response } from "express";
import { authRequired, userIdFromAuth } from "../lib/auth";
import config from "../../config";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db");

const router = Router();

router.get(
  "/payment-init",
  authRequired,
  async (req: Request, res: Response) => {
    try {
      const { rows: flashRows } = await db.query(
        "SELECT id, discount_percent FROM flash_sales LIMIT 1",
      );
      const flashSale = flashRows[0] || {};
      const userId = userIdFromAuth(req);
      const { rows: profileRows } = await db.query(
        "SELECT display_name, shipping_info FROM users WHERE user_id=$1",
        [userId],
      );
      const profile = profileRows[0] || {};
      res.json({
        flashSale,
        profile,
        slots: 0,
        publishableKey: config.stripePublishable,
      });
    } catch (err) {
      res.status(500).json({ error: "unexpected_error" });
    }
  },
);

export default router;
