"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removedEndpoints = removedEndpoints;
const removed = new Set(["/api/generate-model"]);
function removedEndpoints(req, res, next) {
  if (removed.has(req.path)) {
    return res.status(410).json({ error: "removed" });
  }
  return next();
}
