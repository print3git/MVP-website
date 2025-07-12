const request = require("supertest");
const app = require("../scripts/dev-server");

test("serves index on /", async () => {
  const server = app.listen(0);
  try {
    const res = await request(server).head("/");
    expect(res.status).toBe(200);
  } finally {
    server.close();
  }
});
