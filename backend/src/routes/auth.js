const { Router } = require("express");
const bcrypt = require("bcryptjs");
const db = require("../../db");
const logger = require("../logger.js");
const { capture } = require("../lib/logger");

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "invalid_email" });
    }
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users(username,email,password_hash) VALUES ($1,$2,$3)",
      [username, email, hash],
    );
    res.json({ token: "test.jwt" });
  } catch (err) {
    logger.error("register_failed", err);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const result = await db.query(
      "SELECT id, username, password_hash FROM users WHERE username=$1",
      [username],
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
    res.json({ token: "test.jwt" });
  } catch (err) {
    logger.error("login_failed", err);
    capture(err);
    res.status(500).json({ error: "unexpected_error" });
  }
});

module.exports = router;
