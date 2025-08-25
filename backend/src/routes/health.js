"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pkg = require("../../package.json");
const router = (0, express_1.Router)();
router.get("/healthz", (_req, res) => {
  res.json({ ok: true, version: pkg.version });
});
exports.default = router;
