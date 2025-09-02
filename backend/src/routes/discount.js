const { Router } = require("express");
const db = require("../../db");

const router = Router();

router.post("/discount-code", async (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "missing_code" });
  try {
    const result = await db.query(
      "SELECT * FROM discount_codes WHERE code=$1",
      [code],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "invalid_code" });
    }
    res.json({ discount: result.rows[0].amount_cents });
  } catch (err) {
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.post("/generate-discount", async (_req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO discount_codes DEFAULT VALUES RETURNING code",
    );
    res.json({ code: result.rows[0].code });
  } catch (err) {
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
