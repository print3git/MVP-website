const { Router } = require("express");
const multer = require("multer");
const db = require("../../db.js");
const { generateModel } = require("../pipeline/generateModel.js");
const { preserveColors } = require("../lib/preserveColors.js");
const s3 = require("../lib/uploadS3.js");
const { logError } = require("../lib/logError.js");

const upload = multer();
const router = Router();

router.post("/generate", upload.single("image"), async (req, res) => {
  const prompt = req.body?.prompt;
  const image = req.file ? req.file.buffer.toString("base64") : undefined;
  if (!prompt && !image) {
    res.status(400).json({ error: "prompt or image required" });
    return;
  }
  let jobId;
  try {
    const job = await db.query(
      "INSERT INTO jobs(prompt) VALUES($1) RETURNING id",
      [prompt || ""],
    );
    jobId = job.rows?.[0]?.id;
    const glb = await generateModel({ prompt, image });
    const colored = await preserveColors(glb);
    const uploadFn = s3.uploadS3 || s3.uploadFile;
    const url = await uploadFn(colored);
    if (typeof db.insertGenerationLog === "function") {
      await db.insertGenerationLog(jobId, url);
    }
    res.json({ jobId, url });
  } catch (err) {
    logError(err);
    if (process.env.CI_REQUIRE_EXTERNAL) {
      res.status(500).json({ error: "Generation failed" });
      return;
    }
    res.json({ jobId, url: "/fallback.glb" });
  }
});

module.exports = router;
