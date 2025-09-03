import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import logger from "../logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = require("../../db");

const router = Router();

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    res.status(400).json({ error: "bad_request" });
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: "bad_request" });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      "INSERT INTO users(username, email, password_hash) VALUES($1,$2,$3) RETURNING id, username",
      [username, email, hash],
    );
    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.AUTH_SECRET || "secret",
    );
    res.json({ token });
  } catch (err) {
    logger.error("register_failed", err as Error);
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "bad_request" });
    return;
  }
  try {
    const { rows } = await db.query(
      "SELECT id, username, password_hash FROM users WHERE username=$1",
      [username],
    );
    if (!rows.length) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash || "");
    if (!ok) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.AUTH_SECRET || "secret",
    );
    res.json({ token });
  } catch (err) {
    logger.error("login_failed", err as Error);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
