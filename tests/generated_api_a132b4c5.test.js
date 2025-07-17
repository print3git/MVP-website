const path = require("path");
const request = require("supertest");
const awsMock = require("aws-sdk-mock");
const { startServer } = require("./util");
let server;
let url;

beforeAll(async () => {
  const s = await startServer(4003);
  server = s;
  url = s.url;
});

afterAll(async () => {
  if (server) await server.close();
  awsMock.restore();
});

describe("POST /api/models upload scenarios", () => {
  const fixture = path.join(__dirname, "..", "models", "bag.glb");

  afterEach(() => {
    awsMock.restore("S3");
  });

  for (let i = 0; i < 50; i++) {
    test(`valid .glb upload ${i}`, async () => {
      awsMock.mock("S3", "putObject", Promise.resolve({}));
      const res = await request(url)
        .post("/api/models")
        .attach("model", fixture);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("url");
    });
  }
});

describe("GET /api/models/:id retrieval", () => {
  for (let i = 0; i < 50; i++) {
    test(`existing model fetch ${i}`, async () => {
      awsMock.mock("S3", "getSignedUrl", (_, __, cb) =>
        cb(null, "https://s3.test/file.glb"),
      );
      const res = await request(url).get(`/api/models/${i + 1}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("url");
    });
  }
});

describe("GET /api/models listing and filters", () => {
  for (let i = 0; i < 50; i++) {
    test(`list page ${i}`, async () => {
      const res = await request(url)
        .get("/api/models")
        .query({ limit: 10, offset: i * 10 });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  }
});

describe("DELETE /api/models cleanup", () => {
  for (let i = 0; i < 50; i++) {
    test(`delete id ${i}`, async () => {
      awsMock.mock("S3", "deleteObject", Promise.resolve({}));
      const res = await request(url).delete(`/api/models/${i}`);
      expect([200, 204]).toContain(res.status);
    });
  }
});
