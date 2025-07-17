const request = require("supertest");
const app = require("../backend/server");

process.env.NODE_ENV = "test";
process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.test";
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET = "bucket";

jest.mock("../backend/db", () => ({
  query: jest.fn(),
}));

const db = require("../backend/db");

afterEach(() => {
  jest.clearAllMocks();
});

describe("happy path startup", () => {
  for (let i = 0; i < 50; i++) {
    test(`json parsing ${i}`, async () => {
      const body = { prompt: `p${i}`, fileKey: `f${i}.glb` };
      const url = `https://cdn.test/${body.fileKey}`;
      db.query.mockResolvedValueOnce({ rows: [{ id: i + 1, ...body, url }] });
      const res = await request(app)
        .post("/api/models")
        .set("Content-Type", "application/json")
        .send(body);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: i + 1,
        prompt: body.prompt,
        filekey: body.fileKey,
        url,
      });
    });
  }
});

describe("malformed json payloads", () => {
  for (let i = 0; i < 50; i++) {
    test(`bad json ${i}`, async () => {
      const res = await request(app)
        .post("/api/models")
        .set("Content-Type", "application/json")
        .send(`{"prompt": "p${i}", "fileKey": "f${i}.glb"`); // missing closing }
      expect(res.status).toBe(400);
    });
  }
});

describe("missing or invalid content type", () => {
  for (let i = 0; i < 50; i++) {
    test(`no content type ${i}`, async () => {
      const res = await request(app)
        .post("/api/models")
        .send(JSON.stringify({ prompt: `p${i}`, fileKey: `f${i}.glb` }));
      expect(res.status).toBe(415);
    });
  }
});

describe("openapi and router behavior", () => {
  for (let i = 0; i < 10; i++) {
    test(`openapi spec ${i}`, async () => {
      const res = await request(app).get("/openapi.json");
      expect(res.status).toBe(200);
      expect(() => JSON.parse(res.text)).not.toThrow();
      expect(JSON.parse(res.text).openapi).toBeDefined();
    });
  }

  for (let i = 0; i < 10; i++) {
    test(`router error ${i}`, async () => {
      db.query.mockRejectedValueOnce(new Error("fail"));
      const body = { prompt: `p${i}`, fileKey: `f${i}.glb` };
      const res = await request(app)
        .post("/api/models")
        .set("Content-Type", "application/json")
        .send(body);
      expect(res.status).toBe(500);
    });
  }

  for (let i = 0; i < 30; i++) {
    test(`mount order ${i}`, () => {
      const stack = app._router.stack.filter((l) => l.route);
      const paths = stack.map((l) => l.route.path);
      expect(paths.indexOf("/api/models")).toBeLessThan(
        paths.indexOf("/api/users"),
      );
    });
  }
});
