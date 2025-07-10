process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.CLOUDFRONT_MODEL_DOMAIN = "https://domain";

const original = process.env.CLOUDFRONT_MODEL_DOMAIN;

test("throws if CLOUDFRONT_MODEL_DOMAIN missing", () => {
  jest.isolateModules(() => {
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    expect(() => require("../config")).toThrow(/CLOUDFRONT_MODEL_DOMAIN/);
  });
});

test("loads when CLOUDFRONT_MODEL_DOMAIN restored", () => {
  jest.isolateModules(() => {
    process.env.CLOUDFRONT_MODEL_DOMAIN = original;
    const cfg = require("../config");
    expect(cfg.cloudfrontModelDomain).toBe(original);
  });
});
