import { createHash } from "crypto";
import nock from "nock";
import { generateGlb } from "../../src/lib/sparc3dClient";

/** Ensure cached generation returns identical output */
describe("glb caching", () => {
  beforeEach(() => {
    process.env.SPARC3D_ENDPOINT = "https://api.example/generate";
    process.env.SPARC3D_TOKEN = "token";

    const url = new URL(process.env.SPARC3D_ENDPOINT);
    const data = Buffer.from("glbdata");
    nock(url.origin)
      .post(url.pathname)
      .times(2)
      .reply(200, data, { "Content-Type": "model/gltf-binary" });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  test("same prompt yields identical glb", async () => {
    const buf1 = await generateGlb({ prompt: "cube" });
    const buf2 = await generateGlb({ prompt: "cube" });

    const h1 = createHash("sha256").update(buf1).digest("hex");
    const h2 = createHash("sha256").update(buf2).digest("hex");

    expect(h1).toBe(h2);
  });
});
