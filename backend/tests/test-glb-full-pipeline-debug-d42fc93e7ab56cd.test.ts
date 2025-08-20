import { generateModel } from "../src/pipeline/generateModel";
import * as sparc3d from "../src/lib/sparc3dClient";
import * as preserveColors from "../src/lib/preserveColors";
import * as storeGlb from "../src/lib/storeGlb";
import * as uploadS3 from "../src/lib/uploadS3";
import nock from "nock";

describe("debug glb full pipeline", () => {
  nock.disableNetConnect();
  nock.enableNetConnect("127.0.0.1|localhost");
  process.env.CI_REQUIRE_EXTERNAL = "0";
  process.env.STABILITY_KEY = "test";
  process.env.AWS_REGION = "us-east-1";
  process.env.S3_BUCKET = "bucket";
  process.env.CLOUDFRONT_MODEL_DOMAIN = "cdn.example.com";
  process.env.AWS_ACCESS_KEY_ID = "id";
  process.env.AWS_SECRET_ACCESS_KEY = "secret";
  process.env.SPARC3D_ENDPOINT = "http://localhost/sparc";
  process.env.SPARC3D_TOKEN = "token";

  nock("https://api.stability.ai")
    .post("/v2beta/stable-image/generate/core")
    .reply(200, { image: "mock" });

  test("runs pipeline end-to-end with detailed logging", async () => {
    jest
      .spyOn(uploadS3, "uploadFile")
      .mockResolvedValue("https://cdn.example.com/image.png");
    jest
      .spyOn(sparc3d, "generateGlb")
      .mockResolvedValue(Buffer.from("glTFmock"));
    jest
      .spyOn(preserveColors, "preserveColors")
      .mockImplementation(async (b) => b);
    jest
      .spyOn(storeGlb, "storeGlb")
      .mockResolvedValue("https://example.com/model.glb");

    const prompt = "debug cube";
    const url = await generateModel({ prompt });
    console.log("generateModel url", url);
    expect(url).toMatch(/\.glb$/);

    expect(url).toBe("https://example.com/model.glb");
    expect(nock.isDone()).toBe(true);
  }, 600000);
});
