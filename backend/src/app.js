const express = require("express");
const legacyRouter = require("./legacyServerBridge");
const { capture } = require("./lib/logger");
const logger = require("../../src/logger.js");

const app = express();
module.exports = app;
module.exports.app = app;
module.exports.default = app;

try {
  (() => {
    const r = require("./routes/stripeWebhook");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load stripe webhook router", err);
}

app.use(express.json());

try {
  (() => {
    const r = require("./routes/health");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load health router", err);
}

try {
  (() => {
    const r = require("./routes/items");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load items router", err);
}

try {
  (() => {
    const r = require("./routes/checkout");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load checkout router", err);
}

try {
  (() => {
    const r = require("./routes/stripe/create-checkout-session");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load stripe checkout router", err);
}

try {
  (() => {
    const r = require("./routes/models");
    app.use("/api/models", r.default || r);
  })();
} catch (err) {
  console.error("Failed to load models router", err);
}

try {
  (() => {
    const r = require("./routes/legacy");
    app.use(r.default || r);
  })();
} catch (err) {
  console.error("Failed to load legacy router", err);
}

app.use(legacyRouter);

app.use((err, req, res, _next) => {
  const context = { method: req.method, url: req.originalUrl, body: req.body };
  try {
    logger.error("Error handling request", context, err);
  } catch {
    // ignore logging failures
  }
  capture(err);
  res.status(500).json({ error: "Internal Server Error" });
});
