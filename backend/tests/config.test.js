process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.CLOUDFRONT_MODEL_DOMAIN = "https://domain";
const { mockSecrets } = require("../src/lib/mockEnv");

const original = process.env.CLOUDFRONT_MODEL_DOMAIN;

test("warns if CLOUDFRONT_MODEL_DOMAIN missing", () => {
  jest.isolateModules(() => {
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    expect(() => require("../config")).not.toThrow();
  });
});

test("loads when CLOUDFRONT_MODEL_DOMAIN restored", () => {
  jest.isolateModules(() => {
    process.env.CLOUDFRONT_MODEL_DOMAIN = original;
    const cfg = require("../config");
    expect(cfg.cloudfrontModelDomain).toBe(original);
  });
});

test("uses mock DB_URL when missing", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.isolateModules(() => {
    delete process.env.DB_URL;
    const cfg = require("../config");
    expect(cfg.dbUrl).toBe(mockSecrets.DB_URL);
  });
  expect(warn).not.toHaveBeenCalled();
  warn.mockRestore();
});

test("returns malformed DB_URL without throwing", () => {
  jest.isolateModules(() => {
    process.env.DB_URL = "not a url";
    process.env.STRIPE_SECRET_KEY = "key";
    process.env.STRIPE_WEBHOOK_SECRET = "wh";
    const cfg = require("../config");
    expect(cfg.dbUrl).toBe("not a url");
  });
});
