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
  beforeEach(() => {
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  });
  afterEach(() => {
    nock_1.default.cleanAll();
  });
  test("sends prompt and returns buffer", async () => {
    const endpoint = process.env.SPARC3D_ENDPOINT;
    const token = process.env.SPARC3D_TOKEN;
    const url = new URL(endpoint);
    const data = Buffer.from("glbdata");
    (0, nock_1.default)(url.origin)
      .post(url.pathname, { prompt: "hello" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await (0, sparc3dClient_1.generateGlb)({ prompt: "hello" });
    expect(buf).toEqual(data);
  });
  test("sends prompt and imageURL", async () => {
    const endpoint = process.env.SPARC3D_ENDPOINT;
    const token = process.env.SPARC3D_TOKEN;
    const url = new URL(endpoint);
    const data = Buffer.from("xyz");
    (0, nock_1.default)(url.origin)
      .post(url.pathname, { prompt: "p", imageURL: "http://img" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await (0, sparc3dClient_1.generateGlb)({
      prompt: "p",
      imageURL: "http://img",
    });
    expect(buf).toEqual(data);
  });
  test("throws on http error", async () => {
    const endpoint = process.env.SPARC3D_ENDPOINT;
    const url = new URL(endpoint);
    (0, nock_1.default)(url.origin)
      .post(url.pathname)
      .reply(400, { error: "bad" });
    await expect(
      (0, sparc3dClient_1.generateGlb)({ prompt: "x" }),
    ).rejects.toThrow("bad");
  });

  test("ignores proxy environment variables", async () => {
    process.env.http_proxy = "http://proxy:9999";
    process.env.https_proxy = "http://proxy:9999";
    const token = process.env.SPARC3D_TOKEN;
    const data = Buffer.from("abc");
    (0, nock_1.default)("https://api.example.com")
      .post("/generate", { prompt: "p2" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
    const buf = await (0, sparc3dClient_1.generateGlb)({ prompt: "p2" });
    expect(buf).toEqual(data);
  });
});
