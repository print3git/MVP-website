const request = require("supertest");
const app = require("../../server");

describe("healthz routes", () => {
  it("GET /healthz returns 200", async () => {
    await request(app).get("/healthz").expect(200);
  });
});
