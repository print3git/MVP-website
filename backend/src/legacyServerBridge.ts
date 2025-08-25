import express from "express";
import type { RequestHandler } from "express";

const router = express.Router();

try {
  // Bridge to legacy backend/server.js handlers
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const legacyApp: RequestHandler = require("../server.js");
  router.use(legacyApp);
} catch (err) {
  console.warn("Legacy server not found", err);
}

export default router;
