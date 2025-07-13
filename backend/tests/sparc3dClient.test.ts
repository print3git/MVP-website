
import nock from "nock";
import { generateGlb } from "../src/lib/sparc3dClient";

describe("generateGlb", () => {
  beforeEach(() => {
    delete process.env.http_proxy;
    delete process.env.https_proxy;
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("sends prompt and returns buffer", async () => {
    const endpoint = process.env.SPARC3D_ENDPOINT as string;
    const token = process.env.SPARC3D_TOKEN as string;
    const url = new URL(endpoint);
    const data = Buffer.from("glbdata");

    nock(url.origin)
      .post(url.pathname, { prompt: "hello" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });

    const buf = await generateGlb({ prompt: "hello" });
    expect(buf).toEqual(data);
  });

  test("sends prompt and imageURL", async () => {

    const endpoint = process.env.SPARC3D_ENDPOINT as string;
    const token = process.env.SPARC3D_TOKEN as string;
    const url = new URL(endpoint);
    const data = Buffer.from("xyz");

    nock(url.origin)
      .post(url.pathname, { prompt: "p", imageURL: "http://img" })
      .matchHeader("Authorization", `Bearer ${token}`)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });

    const buf = await generateGlb({ prompt: "p", imageURL: "http://img" });
    expect(buf).toEqual(data);
  });

  test("throws on http error", async () => {

    const endpoint = process.env.SPARC3D_ENDPOINT as string;
    const url = new URL(endpoint);

    nock(url.origin).post(url.pathname).reply(400, { error: "bad" });

    await expect(generateGlb({ prompt: "x" })).rejects.toThrow("bad");
  });
});
