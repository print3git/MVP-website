import express, { type NextFunction, type Request, type Response } from "express";
import legacyRouter from "./legacyServerBridge";
import { capture } from "./lib/logger";
import logger from "../../src/logger.js";

const app = express();
export { app };

try {
  (() => { const r = require("./routes/stripeWebhook"); app.use(r.default || r); })();
} catch (err) {
  console.error("Failed to load stripe webhook router", err);
}

app.use(express.json());

try {
  (() => { const r = require("./routes/health"); app.use(r.default || r); })();
} catch (err) {
  console.error("Failed to load health router", err);
}

try {
  (() => { const r = require("./routes/items"); app.use(r.default || r); })();
} catch (err) {
  console.error("Failed to load items router", err);
}

try {
  (() => { const r = require("./routes/checkout"); app.use(r.default || r); })();
} catch (err) {
  console.error("Failed to load checkout router", err);
}

try {
  (() => { const r = require("./routes/stripe/create-checkout-session"); app.use(r.default || r); })();
} catch (err) {
  console.error("Failed to load stripe checkout router", err);
}

try {
  (() => { const r = require("./routes/models"); app.use("/api/models", r.default || r); })();
} catch (err) {
  console.error("Failed to load models router", err);
}

app.use(legacyRouter);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const context = { method: req.method, url: req.originalUrl, body: req.body };
  try {
    logger.error("Error handling request", context, err);
  } catch {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
module.exports = app;
module.exports.app = app;
