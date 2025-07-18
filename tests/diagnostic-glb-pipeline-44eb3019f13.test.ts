import request from "../backend/node_modules/supertest";
import axios from "axios";
import app from "../backend/server";

// Only run when explicitly enabled. This test exercises the full
// GLB generation pipeline against live services using real
// credentials from the environment.
const run = process.env.RUN_GLB_DIAGNOSTIC === "1" ? test : test.skip;

describe("diagnostic glb pipeline", () => {
  run("generates a model end-to-end", async () => {
    jest.setTimeout(300000); // up to 5 minutes

    console.log("→ POST /api/generate");
    const generateRes = await request(app)
      .post("/api/generate")
      .field("prompt", "diagnostic pipeline cube");
    console.log("← status", generateRes.status, "body", generateRes.body);
    expect(generateRes.status).toBe(200);
    const url = generateRes.body.glb_url;
    const fallback =
      "https://modelviewer.dev/shared-assets/models/Astronaut.glb";
    expect(url).toBeDefined();
    expect(url).not.toBe(fallback);

    console.log("→ HEAD", url);
    const head = await axios.head(url, { validateStatus: () => true });
    console.log("←", head.status);
    expect(head.status).toBe(200);
    expect(parseInt(head.headers["content-length"] || "0", 10)).toBeGreaterThan(
      0,
    );

    console.log("→ GET", url);
    const get = await axios.get(url, {
      responseType: "arraybuffer",
      validateStatus: () => true,
    });
    console.log("←", get.status, "bytes", get.data.byteLength);
    expect(get.status).toBe(200);
    const buf = Buffer.from(get.data);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.toString("utf8", 0, 4)).toBe("glTF");
  });
});
