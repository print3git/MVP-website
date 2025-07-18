const waitOn = require("wait-on");
const app = require("../../backend/server");

jest.setTimeout(10000);

test("wait-on fails when server not on port 3000", async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_URL = "postgres://user:pass@localhost/db";
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
  process.env.S3_BUCKET = "bucket";

  const server = app.listen(3999);
  let error;
  try {
    await waitOn({ resources: ["http://localhost:3000"], timeout: 1000 });
  } catch (err) {
    error = err;
  } finally {
    await new Promise((r) => server.close(r));
  }
  expect(error).toBeTruthy();
  expect(String(error)).toMatch(/localhost:3000/);
});
