const request = require("supertest");
const app = require("../../src/app");

test("unsigned webhook returns 400", async () => {
  await request(app)
    .post("/stripe/webhook")
    .set("Content-Type", "application/json")
    .send("{}")
    .expect(400);
});
