process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
process.env.STRIPE_SECRET_KEY = "sk";
process.env.STRIPE_WEBHOOK_SECRET = "whsec";

jest.mock("pg");
const { Pool } = require("pg");

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  delete process.env.DB_URL;
  delete process.env.HTTP2;
});

test("throws when DB_URL missing", () => {
  jest.isolateModules(() => {
    delete process.env.DB_URL;
    Pool.mockImplementation(() => {
      throw new Error("missing connection string");
    });
    expect(() => require("../server")).toThrow("missing connection string");
  });
});

test("exports express app with valid env", () => {
  jest.isolateModules(() => {
    process.env.DB_URL = "postgres://user:pass@localhost/db";
    Pool.mockImplementation(() => ({ query: jest.fn() }));
    const app = require("../server");
    expect(typeof app).toBe("function");
    expect(typeof app.use).toBe("function");
  });
});

test("loads with HTTP2 flag set", () => {
  jest.isolateModules(() => {
    process.env.DB_URL = "postgres://user:pass@localhost/db";
    process.env.HTTP2 = "true";
    Pool.mockImplementation(() => ({ query: jest.fn() }));
    const app = require("../server");
    expect(typeof app.listen).toBe("function");
  });
});
