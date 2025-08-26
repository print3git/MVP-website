const { Router } = require("express");
const QRCode = require("qrcode");
const db = require("../../db");
const { authRequired } = require("../lib/auth");
const { logError } = require("../lib/logError");
const { createTimedCode } = require("../../discountCodes");

const router = Router();

router.get("/referral-link", authRequired, async (req, res) => {
  try {
    const code = await db.getOrCreateReferralLink(req.user.id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.get("/referral-click", async (req, res) => {
  const code = req.query.code || (req.body && req.body.code);
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
    res.json({ ok: true });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

router.post("/referral-signup", async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const userId = await db.getUserIdForReferral(code);
    if (!userId) {
      res.status(404).json({ error: "Invalid code" });
      return;
    }
    await db.insertReferralEvent(userId, "signup");
    await db.query("INSERT INTO incentives(user_id, code) VALUES($1,$2)", [
      userId,
      "referral_bonus",
    ]);
    await createTimedCode(300, 168);
    const reward = await createTimedCode(300, 168);
    res.json({ code: reward });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to process referral" });
  }
});

router.post("/referral-post", authRequired, async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    res.status(400).json({ error: "Missing url" });
    return;
  }
  try {
    const { verifyTag } = require("../../social");
    const ok = await verifyTag(url);
    if (!ok) {
      res.status(400).json({ error: "Invalid tag" });
      return;
    }
    const code = await createTimedCode(500, 168);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to process post" });
  }
});

router.get("/orders/:id/referral-link", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== req.user.id) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    res.json({ code });
  } catch (err) {
    logError(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.get("/orders/:id/referral-qr", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== req.user.id) {
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

module.exports = router;
module.exports.default = router;
