import express from "express";
import logger from "./logger.js";
import errorHandler from "./middleware/errorHandler";

const app = express();
export { app };

try {
  (() => {
    const r = require("./routes/stripeWebhook");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load stripe webhook router", err as Error);
}

app.use(express.json());

try {
  (() => {
    const r = require("./routes/health");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load health router", err as Error);
}

try {
  (() => {
    const r = require("./routes/items");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load items router", err as Error);
}

try {
  (() => {
    const r = require("./routes/checkout");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load checkout router", err as Error);
}

try {
  (() => {
    const r = require("./routes/models");
    app.use("/api/models", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load models router", err as Error);
}

try {
  (() => {
    const r = require("./routes/generate");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load generate router", err as Error);
}

try {
  (() => {
    const r = require("./routes/analytics");
    app.use(r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load analytics router", err as Error);
}

try {
  (() => {
    const r = require("./routes/referral");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load referral router", err as Error);
}

try {
  (() => {
    const r = require("./routes/rewards");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load rewards router", err as Error);
}

try {
  (() => {
    const r = require("./routes/subscription");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load subscription router", err as Error);
}

try {
  (() => {
    const r = require("./routes/credits");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load credits router", err as Error);
}

try {
  (() => {
    const r = require("./routes/payments");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load payments router", err as Error);
}

try {
  (() => {
    const r = require("./routes/worker");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load worker router", err as Error);
}

try {
  (() => {
    const r = require("./routes/status");
    app.use("/api", r.default || r);
  })();
} catch (err) {
  logger.error("Failed to load status router", err as Error);
}

app.use(errorHandler);

export default app;
module.exports = app;
module.exports.app = app;
