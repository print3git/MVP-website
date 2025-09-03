const { Router } = require("express");
const logger = require("../logger.js");
const db = require("../../db");

const router = Router();

router.post("/discount-code", async (req, res) => {
  const { code } = req.body || {};
  if (!code) {
    res.status(400).json({ error: "bad_request" });
    return;
  }
  try {
    const { rows } = await db.query(
      "SELECT * FROM discount_codes WHERE code=$1",
      [code],
    );
    if (!rows.length) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ discount: rows[0].amount_cents });
  } catch (err) {
    logger.error("discount_code_failed", err);
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/generate-discount", async (_req, res) => {
  try {
    const { rows } = await db.query(
      "INSERT INTO discount_codes DEFAULT VALUES RETURNING code",
    );
    res.json({ code: rows[0].code });
  } catch (err) {
    logger.error("generate_discount_failed", err);
    res.status(500).json({ error: "internal_error" });
  }
});

module.exports = router;
module.exports.default = router;
