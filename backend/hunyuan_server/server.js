require("dotenv").config();
const requiredEnv = ["HUNYUAN_API_KEY"];
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}
const express = require("express");
const multer = require("multer");
const axios = require("axios");
const obj2gltf = require("obj2gltf");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const app = express();
const baseUrl =
  process.env.HUNYUAN_BASE_URL || "https://hunyuan.tencentcloudapi.com";

/**
 * POST /generate
 * Accepts a text prompt and optional image upload.
 * Calls the Hunyuan 3D API and converts the resulting OBJ to glTF.
 */
app.post("/generate", upload.single("image"), async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "prompt required" });
  }

  try {
    // Placeholder call to the real Hunyuan API
    const apiKey = process.env.HUNYUAN_API_KEY;
    const response = await axios.post(
      `${baseUrl}/generate`,
      { prompt },
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );

    const objUrl = response.data.obj_url;
    const objResp = await axios.get(objUrl, { responseType: "arraybuffer" });
    const tmpDir = path.join(__dirname, "tmp");
    await fs.promises.mkdir(tmpDir, { recursive: true });
    const objPath = path.join(tmpDir, `${uuidv4()}.obj`);
    fs.writeFileSync(objPath, objResp.data);

    const modelsDir = path.join(__dirname, "..", "models");
    await fs.promises.mkdir(modelsDir, { recursive: true });
    const glbName = `${uuidv4()}.glb`;
    const glbPath = path.join(modelsDir, glbName);
    await obj2gltf(objPath, { output: glbPath });
    await fs.promises.unlink(objPath).catch(() => {});

    res.json({ glb_url: `/models/${glbName}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "generation failed" });
  }
});

const PORT = process.env.HUNYUAN_PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Hunyuan3D server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
