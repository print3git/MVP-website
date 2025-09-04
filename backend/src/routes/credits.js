"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../lib/auth");
const db = require("../../db");
const router = (0, express_1.Router)();
router.get("/credits", auth_1.authRequired, async (req, res) => {
  try {
    const credit = await db.getSaleCredit(req.user.id);
    res.json({ credit });
  } catch {
    res.status(500).json({ error: "Failed to fetch credit" });
  }
});
router.post("/credits/redeem", auth_1.authRequired, async (req, res) => {
  try {
    const amount = Number(req.body.amount_cents) || 0;
    const credit = await db.adjustSaleCredit(req.user.id, -amount);
    res.json({ credit });
  } catch {
    res.status(500).json({ error: "Failed to redeem credit" });
  }
});
exports.default = router;
