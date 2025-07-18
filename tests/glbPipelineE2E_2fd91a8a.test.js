const axios = require("axios");
const { generateModel } = require("../backend/src/pipeline/generateModel");

// This test triggers the full GLB generator pipeline using real environment
// variables. It is skipped unless RUN_GLTF_E2E=1 is set. When enabled it
// submits a representative prompt, waits for processing and validates the
// returned .glb file.

const runTest = process.env.RUN_GLTF_E2E === "1";

(runTest ? test : test.skip)(
  "runs generator pipeline end-to-end and validates .glb output",
  async () => {
    const url = await generateModel({
      prompt: "a realistic red sports car on a racetrack",
    });

    // Fetch the resulting GLB file from storage
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const data = Buffer.from(response.data);

    // Validate non-empty GLB with correct header
    expect(data.length).toBeGreaterThan(0);
    expect(data.toString("utf8", 0, 4)).toBe("glTF");

    // Loading into a full glTF loader would require additional deps;
    // assume success if header matches and file downloaded without error.
  },
  30000,
);
