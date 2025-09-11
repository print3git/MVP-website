const request = require("supertest");
process.env.STRIPE_KEY = "sk_test_valid";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
const app = require("../../src/app");

test("unsigned webhook returns 400", async () => {
  await request(app)
    .post("/api/webhook/stripe")
    .set("Content-Type", "application/json")
    .send("{}")
    .expect(400);
});
