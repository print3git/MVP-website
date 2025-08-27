let cached;

function isProd() {
  return process.env.NODE_ENV === "production";
}

function shouldWarn() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.QUIET_ENV_WARNINGS !== "1"
  );
}

function warn(msg) {
  if (shouldWarn()) console.warn(msg);
}

function requireEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  if (!value) {
    if (isProd()) {
      throw new Error(`${name} is required`);
    }
    warn(`${name} is not set`);
    return undefined;
  }
  return value;
}

function getEnv() {
  if (cached) return cached;
  const env = {
    DB_URL: requireEnv("DB_URL"),
    STRIPE_SECRET_KEY: requireEnv("STRIPE_SECRET_KEY"),
    STRIPE_PUBLISHABLE_KEY: requireEnv("STRIPE_PUBLISHABLE_KEY"),
    NODE_ENV: requireEnv("NODE_ENV"),
    AWS_REGION: optionalEnv("AWS_REGION"),
    S3_BUCKET: optionalEnv("S3_BUCKET"),
    CLOUDFRONT_MODEL_DOMAIN: (function () {
      const val =
        process.env.CLOUDFRONT_MODEL_DOMAIN || process.env.CLOUDFRONT_DOMAIN;
      if (!val) {
        if (isProd()) throw new Error("CLOUDFRONT_MODEL_DOMAIN is required");
        warn("CLOUDFRONT_MODEL_DOMAIN is not set");
        return undefined;
      }
      return val;
    })(),
    PRINTER_API_URL: optionalEnv("PRINTER_API_URL"),
  };
  cached = Object.freeze(env);
  return cached;
}

module.exports = { getEnv };
