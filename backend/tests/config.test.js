process.env.DB_URL = "postgres://user:pass@localhost/db";
process.env.STRIPE_SECRET_KEY = "test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";
process.env.CLOUDFRONT_MODEL_DOMAIN = "https://domain";

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

test("warns when required vars missing", () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.isolateModules(() => {
    delete process.env.DB_URL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    require("../config");
  });
  expect(warn).toHaveBeenCalledWith(
    expect.stringContaining("Missing required env vars"),
  );
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
