"use strict";

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

const logger = require("./logger.js");

function buildEnv() {
  const NODE_ENV = requireEnv("NODE_ENV");
  if (!["development", "test", "production"].includes(NODE_ENV)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  const isProd = NODE_ENV === "production";
  const shouldWarn =
    NODE_ENV === "development" && process.env.QUIET_ENV_WARNINGS !== "1";
  const warn = (msg) => {
    if (shouldWarn) logger.warn(msg);
  };
  const optional = (name) => {
    const value = process.env[name];
    if (!value) {
      if (isProd) throw new Error(`${name} is required`);
      warn(`${name} is not set`);
      return undefined;
    }
    return value;
  };
  return Object.freeze({
    DB_URL: requireEnv("DB_URL"),
    STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
    STRIPE_PUBLISHABLE_KEY: requireEnv("STRIPE_PUBLISHABLE_KEY"),
    NODE_ENV,
    AWS_REGION: optional("AWS_REGION"),
    S3_BUCKET: optional("S3_BUCKET"),
    CLOUDFRONT_DOMAIN: (() => {
      const val =
        process.env.CLOUDFRONT_DOMAIN || process.env.CLOUDFRONT_MODEL_DOMAIN;
      if (!val) {
        if (isProd) throw new Error("CLOUDFRONT_DOMAIN is required");
        warn("CLOUDFRONT_DOMAIN is not set");
        return undefined;
      }
      return val;
    })(),
    PRINTER_API_URL: optional("PRINTER_API_URL"),
  });
}

const ENV = buildEnv();

function getEnv() {
  return ENV;
}

module.exports = { getEnv };
