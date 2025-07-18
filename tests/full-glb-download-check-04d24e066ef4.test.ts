import axios from "axios";
import fs from "fs";
import path from "path";

const runTest = Boolean(process.env.TEST_GLB_DOWNLOAD_URL);

(runTest ? test : test.skip)(
  "Standalone .glb download returns valid model file",
  async () => {
    const url = String(process.env.TEST_GLB_DOWNLOAD_URL);
    expect(url).toMatch(/^https?:\/\/.+\.glb$/);

    const output = path.resolve(__dirname, `tmp/test-model-${Date.now()}.glb`);
    const response = await axios.get(url, { responseType: "stream" });

    expect(response.status).toBe(200);
    const writeStream = fs.createWriteStream(output);
    await new Promise((resolve, reject) => {
      response.data.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const stats = fs.statSync(output);
    expect(stats.size).toBeGreaterThan(5000); // Expect at least 5KB
  },
);
