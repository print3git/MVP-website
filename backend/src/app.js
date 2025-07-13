const express = require("express");
const modelsRouter = require("./routes/models");
const checkoutRouter = require("./routes/checkout").default;
const { capture } = require("./lib/logger");
const logger = require("../../src/logger");

const app = express();
app.use(express.json());
app.use(modelsRouter);
app.use(checkoutRouter);

app.use((err, req, res, _next) => {
  const context = {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
  };
  logger.error("Error handling request", context, err);
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
