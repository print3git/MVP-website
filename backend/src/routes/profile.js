const { Router } = require("express");
const { authRequired, userIdFromAuth } = require("../lib/auth");
const logger = require("../logger.js");
const db = require("../../db");

const router = Router();

router.get("/me", authRequired, async (req, res) => {
  const userId = userIdFromAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.username,
              p.display_name,
              p.avatar_url,
              p.avatar_glb,
              p.shipping_info,
              p.payment_info,
              p.competition_notify
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id=$1`,
      [userId],
    );

    if (!rows.length) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    const row = rows[0];
    const hasProfile =
      row.display_name !== null ||
      row.avatar_url !== null ||
      row.avatar_glb !== null ||
      row.shipping_info !== null ||
      row.payment_info !== null ||
      row.competition_notify !== null;

    const profile = hasProfile
      ? {
          user_id: row.id,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
          avatar_glb: row.avatar_glb,
          shipping_info: row.shipping_info,
          payment_info: row.payment_info,
          competition_notify: row.competition_notify,
        }
      : null;

    res.json({
      id: row.id,
      email: row.email,
      username: row.username,
      avatarUrl: row.avatar_url ?? null,
      profile,
    });
  } catch (err) {
    logger.error("me_fetch_failed", err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.get("/profile", authRequired, async (req, res) => {
  const userId = userIdFromAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const { rows } = await db.query(
      `SELECT u.id AS user_id,
              u.email,
              u.username,
              p.display_name,
              p.avatar_url,
              p.avatar_glb,
              p.shipping_info,
              p.payment_info,
              p.competition_notify
         FROM user_profiles p
         INNER JOIN users u ON u.id = p.user_id
         WHERE p.user_id=$1`,
      [userId],
    );

    if (!rows.length) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(rows[0]);
  } catch (err) {
    logger.error("profile_fetch_failed", err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.post("/profile", authRequired, async (req, res) => {
  const userId = userIdFromAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const body = req.body || {};
  const hasOwn = Object.prototype.hasOwnProperty;
  const displayNameProvided = hasOwn.call(body, "displayName");
  const avatarUrlProvided = hasOwn.call(body, "avatarUrl");
  const avatarGlbProvided = hasOwn.call(body, "avatarGlb");
  const shippingInfoProvided = hasOwn.call(body, "shippingInfo");
  const paymentInfoProvided = hasOwn.call(body, "paymentInfo");
  const competitionNotifyProvided = hasOwn.call(body, "competitionNotify");

  const displayName = displayNameProvided ? (body.displayName ?? null) : null;
  const avatarUrl = avatarUrlProvided ? (body.avatarUrl ?? null) : null;
  const avatarGlb = avatarGlbProvided ? (body.avatarGlb ?? null) : null;
  const shippingInfo = shippingInfoProvided
    ? (body.shippingInfo ?? null)
    : null;
  const paymentInfo = paymentInfoProvided ? (body.paymentInfo ?? null) : null;
  const competitionNotify = competitionNotifyProvided
    ? (body.competitionNotify ?? null)
    : true;

  try {
    await db.query(
      `INSERT INTO user_profiles (user_id, display_name, avatar_url, avatar_glb, shipping_info, payment_info, competition_notify)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = CASE WHEN $8 THEN EXCLUDED.display_name ELSE user_profiles.display_name END,
         avatar_url = CASE WHEN $9 THEN EXCLUDED.avatar_url ELSE user_profiles.avatar_url END,
         avatar_glb = CASE WHEN $10 THEN EXCLUDED.avatar_glb ELSE user_profiles.avatar_glb END,
         shipping_info = CASE WHEN $11 THEN EXCLUDED.shipping_info ELSE user_profiles.shipping_info END,
         payment_info = CASE WHEN $12 THEN EXCLUDED.payment_info ELSE user_profiles.payment_info END,
         competition_notify = CASE WHEN $13 THEN EXCLUDED.competition_notify ELSE user_profiles.competition_notify END,
         updated_at = NOW()`,
      [
        userId,
        displayName,
        avatarUrl,
        avatarGlb,
        shippingInfo,
        paymentInfo,
        competitionNotify,
        displayNameProvided,
        avatarUrlProvided,
        avatarGlbProvided,
        shippingInfoProvided,
        paymentInfoProvided,
        competitionNotifyProvided,
      ],
    );

    res.status(204).send();
  } catch (err) {
    logger.error("profile_upsert_failed", err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
module.exports.default = router;
