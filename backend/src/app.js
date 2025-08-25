const express = require("express");
const healthRouter = require("./routes/health").default;
const itemsRouter = require("./routes/items").default;
const checkoutRouter = require("./routes/checkout").default;
const stripeWebhookRouter = require("./routes/stripeWebhook").default;
const stripeCheckoutRouter =
  require("./routes/stripe/create-checkout-session").default;
const modelsRouter = require("./routes/models").default;
const { capture } = require("./lib/logger");
const logger = require("../../src/logger");
const { removedEndpoints } = require("./middleware/removedEndpoints");

const app = express();
app.use(stripeWebhookRouter);
app.use(express.json());
app.use(removedEndpoints);
app.use(healthRouter);
app.use(itemsRouter);
app.use(checkoutRouter);
app.use(stripeCheckoutRouter);
app.use("/api/models", modelsRouter);

app.use((err, req, res, _next) => {
  const context = { method: req.method, url: req.originalUrl, body: req.body };
  try {
    logger.error("Error handling request", context, err);
  } catch (_logErr) {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
module.exports.app = app;
