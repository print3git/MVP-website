const { Router } = require("express");
const db = require("../../db");

const router = Router();

router.get("/users/:username/profile", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT display_name, avatar_url, avatar_glb FROM users WHERE username=$1",
      [req.params.username],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "not_found" });
    }
    res.json(rows[0]);
  } catch (_err) {
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
