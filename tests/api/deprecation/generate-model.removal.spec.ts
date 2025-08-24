const request = require("supertest");
const app = require("../../../backend/server");

describe("deprecated generate-model endpoint", () => {
  ["get", "post", "put"].forEach((method) => {
    test(`${method.toUpperCase()} /api/generate-model returns 410`, async () => {
      const res = await request(app)[method]("/api/generate-model");
      expect(res.status).toBe(410);
      expect(res.body).toEqual({ error: "removed" });
    });
  });
});
