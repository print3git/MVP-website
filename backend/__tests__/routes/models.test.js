const request = require("supertest");
const app = require("../../server");

describe("models routes", () => {
  it("GET /api/models returns 200", async () => {
    await request(app).get("/api/models").expect(200);
  });
});
