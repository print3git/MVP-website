import fetch from "node-fetch";

describe("HF text-to-model API", () => {
  test("generates glb from prompt", async () => {
    const token = process.env.HF_TOKEN;
    const endpoint =
      process.env.SPARC3D_ENDPOINT ||
      "https://api-inference.huggingface.co/models/print2/Sparc3D";
    if (!token) {
      console.warn("Skipping HF API test: HF_TOKEN missing");
      return;
    }
    const start = Date.now();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "model/gltf-binary",
      },
      body: JSON.stringify({ inputs: "simple cube" }),
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const ms = Date.now() - start;
    console.log(`HF API responded in ${ms}ms`);
    expect(res.status).toBe(200);
    expect(buf.slice(0, 4).toString()).toBe("glTF");
  });
});
