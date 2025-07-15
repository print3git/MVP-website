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

test("warns when required vars are missing", () => {
  jest.isolateModules(() => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.DB_URL;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    require("../config");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Missing required env vars: DB_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
      ),
    );
    warn.mockRestore();
  });
});

test("warns when optional GLB vars are missing", () => {
  jest.isolateModules(() => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.CLOUDFRONT_MODEL_DOMAIN;
    delete process.env.SPARC3D_ENDPOINT;
    delete process.env.SPARC3D_TOKEN;
    require("../config");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "Missing optional GLB env vars: CLOUDFRONT_MODEL_DOMAIN, SPARC3D_ENDPOINT, SPARC3D_TOKEN",
      ),
    );
    warn.mockRestore();
  });
});

test("no warnings when all vars present", () => {
  jest.isolateModules(() => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    process.env.DB_URL = "postgres://user:pass@localhost/db";
    process.env.STRIPE_SECRET_KEY = "test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    process.env.CLOUDFRONT_MODEL_DOMAIN = original;
    process.env.SPARC3D_ENDPOINT = "http://endpoint";
    process.env.SPARC3D_TOKEN = "tok";
    require("../config");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
