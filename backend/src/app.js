const express = require("express");
const logger = require("./logger.js");
const errorHandler = require("./middleware/errorHandler.js");

const app = express();
module.exports = app;
module.exports.app = app;
module.exports.default = app;

try {
  const r = require("./routes/stripeWebhook");
  app.use(r.default || r);
} catch (err) {
  logger.error("Failed to load stripe webhook router", err);
}

app.use(express.json());

try {
  const r = require("./routes/health");
  app.use(r.default || r);
} catch (err) {
  logger.error("Failed to load health router", err);
}

try {
  const r = require("./routes/generate");
  app.use("/api", r.default || r);
} catch (err) {
  logger.error("Failed to load generate router", err);
}

try {
  const r = require("./routes/auth");
  app.use("/api", r.default || r);
} catch (err) {
  logger.error("Failed to load auth router", err);
}

try {
  (() => {
    const r = require("./routes/auth");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load auth router", err);
}

try {
  (() => {
    const r = require("./routes/rewards");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load discount router", err);
}

try {
  (() => {
    const r = require("./routes/discount");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load discount router", err);
}

try {
  (() => {
    const r = require("./routes/subscription");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load subscription router", err);
}

try {
  const r = require("./routes/orders");
  app.use("/api", r.default || r);
} catch (err) {
  logger.error("Failed to load orders router", err);
}

try {
  const r = require("./routes/status");
  app.use("/api", r.default || r);
} catch (err) {
  logger.error("Failed to load status router", err);
}

try {
  const r = require("./routes/users");
  app.use("/api", r.default || r);
} catch (err) {
  logger.error("Failed to load users router", err);
}

try {
  (() => {
    const r = require("./routes/status");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load status router", err);
}

app.use(errorHandler);
