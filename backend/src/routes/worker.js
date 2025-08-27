"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const printWorker_1 = require("../../queue/printWorker");
const router = (0, express_1.Router)();
router.get("/worker/health", (_req, res) => {
  res.json({ ok: true, ready: (0, printWorker_1.isReady)() });
});
exports.default = router;
