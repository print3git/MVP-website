import axios from "axios";
import fs from "fs";

const endpoint = process.env.PIPELINE_API_ENDPOINT;

// Run unconditionally in CI. Fail fast if required env is missing.
if (!endpoint) {
  throw new Error("PIPELINE_API_ENDPOINT is not set");
}

describe("production GLB pipeline", () => {
  jest.setTimeout(30000);

  const prompt = "a shiny red cube on a wooden table";

  test("generates valid .glb from production", async () => {
    const start = Date.now();
    const response = await axios.post(
      endpoint,
      { prompt },
      {
        responseType: "arraybuffer",
        validateStatus: () => true,
      },
    );
    const duration = Date.now() - start;
    console.log("response ms", duration);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/model\/gltf-binary/);

    const data = Buffer.from(response.data);
    console.log("file size bytes", data.length);
    expect(Buffer.isBuffer(data)).toBe(true);
    expect(data.length).toBeGreaterThan(1000);

    fs.writeFileSync("/tmp/test-output.glb", data);
    expect(fs.existsSync("/tmp/test-output.glb")).toBe(true);
    const header = Array.from(data.slice(0, 4));
    expect(header).toEqual([0x67, 0x6c, 0x54, 0x46]);
  });
});
