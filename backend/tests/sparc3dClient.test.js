"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const sparc3dClient_1 = require("../src/lib/sparc3dClient");
describe("generateGlb", () => {
  const endpoint = "https://api.example.com/generate";
  const token = "t0k";
  beforeEach(() => {
    process.env.SPARC3D_ENDPOINT = endpoint;
    process.env.SPARC3D_TOKEN = token;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  });
  afterEach(() => {
    nock_1.default.cleanAll();
  });
  test("sends prompt and returns buffer", async () => {
    const data = Buffer.from("glbdata");
    (0, nock_1.default)("https://api.example.com")
      .post("/generate", { prompt: "hello" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await (0, sparc3dClient_1.generateGlb)({ prompt: "hello" });
    expect(buf).toEqual(data);
  });
  test("sends prompt and imageURL", async () => {
    const data = Buffer.from("xyz");
    (0, nock_1.default)("https://api.example.com")
      .post("/generate", { prompt: "p", imageURL: "http://img" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await (0, sparc3dClient_1.generateGlb)({
      prompt: "p",
      imageURL: "http://img",
    });
    expect(buf).toEqual(data);
  });
  test("throws on http error", async () => {
    (0, nock_1.default)("https://api.example.com")
      .post("/generate")
      .reply(400, { error: "bad" });
    await expect(
      (0, sparc3dClient_1.generateGlb)({ prompt: "x" }),
    ).rejects.toThrow("bad");
  });
});
