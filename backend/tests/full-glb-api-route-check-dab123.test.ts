const request = require("supertest");
const app = require("../server");

const routes = [
  "/api/models/generate",
  "/api/models/status",
  "/api/models/download",
];

const itMaybe = process.env.RUN_GLB_ROUTE_CHECK ? test : test.skip;

describe("GLB API route 2xx checks", () => {
  routes.forEach((route) => {
    itMaybe(`Route ${route} returns 2xx`, async () => {
      const res = await request(app)
        .get(route)
        .set("Authorization", `Bearer ${process.env.TEST_TOKEN}`);
      expect(res.status).toBeGreaterThanOrEqual(200);
      expect(res.status).toBeLessThan(300);
    });
  });
});
