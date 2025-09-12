const { Router } = require("express");
const config = require("../../config");
const db = require("../../db");
const { authRequired } = require("../lib/auth");

const router = Router();

router.get("/payment-init", authRequired, async (req, res) => {
  try {
    const { rows: flashRows } = await db.query(
      "SELECT id, discount_percent FROM flash_sales LIMIT 1",
    );
    const flashSale = flashRows[0] || {};
    const { rows: profileRows } = await db.query(
      "SELECT display_name, shipping_info FROM users WHERE user_id=$1",
      [req.user.id],
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
});

module.exports = router;
module.exports.default = router;
