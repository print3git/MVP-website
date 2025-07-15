const express = require("express");
/**
 * Attach fake authentication middleware to an Express app.
 * @param {express.Application} app Express application instance.
 */
function setupAuth(app = express.application) {
  app.use((req, res, next) => {
    // in CI/tests, we pretend every request is from user "u1"
    req.user = { id: process.env.TEST_USER_ID || "u1", username: "alice" };
    next();
  });
}

// apply middleware to all Express apps by default
setupAuth();

module.exports = setupAuth;
