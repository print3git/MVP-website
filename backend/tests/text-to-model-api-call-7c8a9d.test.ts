import axios from "axios";

describe("huggingface text-to-model", () => {
  const endpoint = process.env.SPARC3D_ENDPOINT;
  const token = process.env.SPARC3D_TOKEN;

  if (
    !endpoint ||
    !token ||
    !endpoint.includes("huggingface.co") ||
    token === "token"
  ) {
    console.warn(
      "Skipping HF integration test; SPARC3D env vars not configured",
    );
    test.skip("text-to-model endpoint", () => {});
    return;
  }

  test("sends prompt and receives glb data or url", async () => {
    const start = Date.now();
    const res = await axios.post(
      endpoint,
      { prompt: "cube" },
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        validateStatus: () => true,
        proxy: false,
      },
    );
    const elapsed = Date.now() - start;
    console.log(`HF response time: ${elapsed}ms`);
    expect(res.status).toBe(200);
    const data = Buffer.from(res.data);
    const body = data.toString("utf8");
    const isGlb = data.slice(0, 4).toString() === "glTF";
    const hasUrl = /\.glb/.test(body);
    expect(isGlb || hasUrl).toBe(true);
  }, 300000);
});
