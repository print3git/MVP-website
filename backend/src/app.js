const express = require("express");
const modelsRouter = require("./routes/models");
const itemsRouter = require("./routes/items").default;
const checkoutRouter = require("./routes/checkout").default;
const stripeWebhookRouter = require("./routes/stripeWebhook").default;
const stripeCheckoutRouter = require("./routes/stripeCheckout").default;
const { capture } = require("./lib/logger");
const logger = require("../../src/logger");

const app = express();
app.use(stripeWebhookRouter);
app.use(express.json());
app.use(modelsRouter);
app.use(itemsRouter);
app.use(checkoutRouter);
app.use(stripeCheckoutRouter);

app.use((err, req, res, _next) => {
  const context = {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  };
  try {
    logger.error("Error handling request", context, err);
  } catch (_logErr) {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
