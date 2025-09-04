import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../src/lib/generateModel", () => ({
  generateModel: jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Buffer>((resolve) =>
          setTimeout(() => resolve(Buffer.from("a")), 80),
        ),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Buffer>((resolve) =>
          setTimeout(() => resolve(Buffer.from("b")), 10),
        ),
    ),
}));

jest.mock("../src/lib/preserveColors", () => ({
  preserveColors: jest.fn(async (b: Buffer) => b),
}));

jest.mock("../src/lib/uploadS3", () => ({
  uploadS3: jest.fn().mockResolvedValue({
    url: "https://mock.url/model.glb",
    key: "k",
  }),
}));

jest.mock("../src/db.js", () => ({
  createJob: jest.fn(),
  linkModelToJob: jest.fn(),
  insertGenerationLog: jest.fn(),
}));

const app = require("../src/app");
const queue = require("../src/queue/generation");
const db = require("../db");
(db as any).query = jest.fn();
const { generateModel } = require("../src/lib/generateModel");
const { uploadS3 } = require("../src/lib/uploadS3");

describe("generate route queue integration", () => {
  test("serializes per-user and updates status", async () => {
    const token = jwt.sign({ id: "u1" }, process.env.AUTH_SECRET || "secret");
    const order: string[] = [];

    const req1 = request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "one" })
      .then((res) => {
        order.push("first");
        return res;
      });
    const req2 = request(app)
      .post("/api/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({ prompt: "two" })
      .then((res) => {
        order.push("second");
        return res;
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(order).toEqual(["first", "second"]);
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(generateModel).toHaveBeenCalledTimes(2);
    expect(uploadS3).toHaveBeenCalledTimes(2);
    expect((db as any).query).not.toHaveBeenCalled();

    const status2 = await request(app).get(`/api/status/${res2.body.jobId}`);
    expect(status2.body.state).toBe("succeeded");
  }, 30000);
});
