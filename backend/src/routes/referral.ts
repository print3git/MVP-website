import { Router } from "express";
import QRCode from "qrcode";
import db from "../../db";
import { authRequired } from "../lib/auth";
import { logError } from "../lib/logError";

const router = Router();

router.get("/api/referral-link", authRequired, async (req, res) => {
  try {
    const code = await db.getOrCreateReferralLink((req as any).user.id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.post("/api/referral-click", async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const referrer = await db.getUserIdForReferral(code);
    if (!referrer) {
      res.status(404).json({ error: "Invalid code" });
      return;
    }
    await db.insertReferralEvent(referrer, "click");
    res.json({ success: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

router.get("/api/orders/:id/referral-qr", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== (req as any).user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    const base =
      req.headers.origin || process.env.SITE_URL || "http://localhost:3000";
    const url = `${base}?ref=${code}`;
    const png = await QRCode.toBuffer(url, { width: 256 });
    res.type("png").send(png);
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

export default router;

