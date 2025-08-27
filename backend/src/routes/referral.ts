import { Router } from "express";
import { authRequired, userIdFromAuth } from "../lib/auth";
import logger from "../logger.js";
import { capture } from "../lib/logger";
import { tinyPng } from "../lib/legacy/tinyPng";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTimedCode } = require("../../discountCodes.js");

const router = Router();

router.get("/referral-link", authRequired, async (req, res) => {
  try {
    const userId = userIdFromAuth(req);
    const code = await db.getOrCreateReferralLink(userId);
    logger.info("referral_link_retrieved", { userId });
    res.json({ code });
  } catch (err) {
    logger.error("referral_link_fetch_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.get("/referral-click", async (req, res) => {
  const code = (req.query.code as string) || (req.body && (req.body as any).code);
  if (!code) {
    logger.warn("referral_click_missing_code");
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const referrer = await db.getUserIdForReferral(code);
    if (!referrer) {
      logger.warn("referral_click_invalid_code", { code });
      res.status(404).json({ error: "Invalid code" });
      return;
    }
    await db.insertReferralEvent(referrer, "click");
    logger.info("referral_click_recorded", { referrer });
    res.json({ ok: true });
  } catch (err) {
    logger.error("referral_click_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to record click" });
  }
});

router.post("/referral-signup", async (req, res) => {
  const { code } = (req.body as any) || {};
  if (!code) {
    logger.warn("referral_signup_missing_code");
    res.status(400).json({ error: "Missing code" });
    return;
  }
  try {
    const userId = await db.getUserIdForReferral(code);
    if (!userId) {
      logger.warn("referral_signup_invalid_code", { code });
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
    logger.info("referral_signup_success", { userId });
    res.json({ code: reward });
  } catch (err) {
    logger.error("referral_signup_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to process referral" });
  }
});

router.post("/referral-post", authRequired, async (req, res) => {
  const { url } = (req.body as any) || {};
  const userId = userIdFromAuth(req);
  if (!url) {
    logger.warn("referral_post_missing_url", { userId });
    res.status(400).json({ error: "Missing url" });
    return;
  }
  try {
    const { verifyTag } = require("../../social");
    const ok = await verifyTag(url);
    if (!ok) {
      logger.warn("referral_post_invalid_tag", { url, userId });
      res.status(400).json({ error: "Invalid tag" });
      return;
    }
    const code = await createTimedCode(500, 168);
    logger.info("referral_post_code_created", { userId });
    res.json({ code });
  } catch (err) {
    logger.error("referral_post_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to process post" });
  }
});

router.get("/orders/:id/referral-link", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const userId = userIdFromAuth(req);
    const { rows } = await db.query("SELECT user_id FROM orders WHERE session_id=$1", [id]);
    if (!rows.length || rows[0].user_id !== userId) {
      logger.warn("order_referral_link_not_found", { id, userId });
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const code = await db.getOrCreateOrderReferralLink(id);
    logger.info("order_referral_link_retrieved", { id, userId });
    res.json({ code });
  } catch (err) {
    logger.error("order_referral_link_fetch_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to fetch referral link" });
  }
});

router.get("/orders/:id/referral-qr", authRequired, async (req, res) => {
  const { id } = req.params;
  try {
    const userId = userIdFromAuth(req);
    const { rows } = await db.query(
      "SELECT user_id FROM orders WHERE session_id=$1",
      [id],
    );
    if (!rows.length || rows[0].user_id !== userId) {
      logger.warn("order_referral_qr_not_found", { id, userId });
      res.status(404).json({ error: "Order not found" });
      return;
    }
    await db.getOrCreateOrderReferralLink(id);
    const png = tinyPng();
    logger.info("order_referral_qr_generated", { id, userId });
    res.type("png").send(png);
  } catch (err) {
    logger.error("order_referral_qr_failed", err);
    capture(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

export default router;

