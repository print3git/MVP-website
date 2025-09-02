const { Router } = require("express");
const db = require("../../db");

const router = Router();

router.post("/admin/competitions", async (req, res) => {
  const token = req.headers["x-admin-token"];
  if (token !== "admin") {
    return res.status(401).json({ error: "unauthorized" });
  }
  const { name, start_date, end_date } = req.body || {};
  await db.query(
    "INSERT INTO competitions(name,start_date,end_date) VALUES ($1,$2,$3)",
    [name, start_date, end_date],
  );
  res.json({ ok: true });
});

module.exports = router;
