import { applyMockEnv } from "../src/lib/mockEnv";

describe("CI env loader", () => {
  const keys = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "S3_BUCKET",
    "DB_URL",
  ];

  beforeEach(() => {
    for (const key of keys) {
      delete process.env[key];
    }
    process.env.CI = "true";
    process.env.NODE_ENV = "test";
    delete process.env.CI_REQUIRE_EXTERNAL;
    jest.resetModules();
  });

  afterEach(() => {
    delete process.env.CI;
  });

  test("provides mocked defaults", () => {
    applyMockEnv();
    expect(process.env.STRIPE_SECRET_KEY).toMatch(/^sk_test/);
    expect(process.env.STRIPE_WEBHOOK_SECRET).toMatch(/^whsec/);
    expect(process.env.AWS_ACCESS_KEY_ID).toBe("mock");
    expect(process.env.AWS_SECRET_ACCESS_KEY).toBe("mock");
    expect(process.env.AWS_REGION).toBe("us-east-1");
    expect(process.env.S3_BUCKET).toBe("mock-bucket");
    expect(process.env.DB_URL).toBe(
      "postgres://user:pass@localhost:5432/testdb",
    );
  });

  test("config loads without live secrets", () => {
    applyMockEnv();
    expect(() => require("../config")).not.toThrow();
  });
});
