const express = require("express");
const logger = require("./logger.js");
const errorHandler = require("./middleware/errorHandler.js");

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
  logger.error("Failed to load stripe webhook router", err);
}

app.use(express.json());

try {
  (() => {
    const r = require("./routes/health");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load health router", err);
}

try {
  (() => {
    const r = require("./routes/items");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load items router", err);
}

try {
  (() => {
    const r = require("./routes/checkout");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load checkout router", err);
}

try {
  (() => {
    const r = require("./routes/models");
    app.use("/api/models", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load models router", err);
}

try {
  (() => {
    const r = require("./routes/generate");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load generate router", err);
}

try {
  (() => {
    const r = require("./routes/analytics");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load analytics router", err);
}

try {
  (() => {
    const r = require("./routes/referral");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load referral router", err);
}

try {
  (() => {
    const r = require("./routes/create-order");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load create-order router", err);
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
  logger.error("Failed to load rewards router", err);
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
  (() => {
    const r = require("./routes/credits");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load credits router", err);
}

try {
  (() => {
    const r = require("./routes/payments");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load payments router", err);
}

try {
  (() => {
    const r = require("./routes/worker");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load worker router", err);
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
