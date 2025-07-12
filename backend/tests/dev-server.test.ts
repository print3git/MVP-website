const request = require("supertest");
const app = require("../../scripts/dev-server");
const fs = require("fs");
const path = require("path");

describe("dev server", () => {
  test("HEAD / responds with 200", async () => {
    await request(app).head("/").expect(200);
  });

  test("index.html exists", () => {
    const index = path.resolve(__dirname, "../..", "index.html");
    expect(fs.existsSync(index)).toBe(true);
  });
});
