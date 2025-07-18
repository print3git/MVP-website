import axios from "axios";
import { generateModel } from "../backend/src/pipeline/generateModel";

const run = process.env.STABILITY_KEY ? describe : describe.skip;

// These tests run the full production pipeline against live services using
// credentials from process.env. They will fail if required secrets are not set.
run("GLB pipeline end-to-end", () => {
  jest.setTimeout(600000); // allow up to 10 minutes per test

  const prompts = [
    "a flying car made of crystals",
    "a 3D model of a medieval sword",
    "a cybernetic bird drone",
    "an alien space station",
    "a futuristic underwater city",
  ];

  for (const prompt of prompts) {
    test(`generates GLB for "${prompt}"`, async () => {
      const url = await generateModel({ prompt });
      expect(typeof url).toBe("string");

      const res = await axios.get(url, { responseType: "arraybuffer" });
      const buf = Buffer.from(res.data);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(0);
      expect(buf.slice(0, 4).toString()).toBe("glTF");
      expect(res.headers["content-type"]).toMatch(/model\/gltf-binary/);
    });
  }
});
