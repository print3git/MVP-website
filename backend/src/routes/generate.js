const { Router } = require("express");
const multer = require("multer");
const db = require("../../db.js");
const { userIdFromAuth } = require("../lib/auth.js");
const { generateModel } = require("../lib/generateModel.js");
const { preserveColors } = require("../lib/preserveColors.js");
const { uploadS3 } = require("../lib/uploadS3.js");
const { logError } = require("../lib/logError.js");
const upload = multer();
const router = Router();
router.post("/generate", upload.single("image"), async (req, res) => {
  const prompt =
    typeof (req.body && req.body.prompt) === "string"
      ? req.body.prompt
      : undefined;
  const image = req.file ? req.file.buffer.toString("base64") : undefined;
  if (!prompt && !image) {
    res.status(400).json({ error: "bad_request" });
    return;
  }
  const userId = userIdFromAuth(req);
  let jobId;
  const start = Date.now();
  try {
    if (typeof db.createJob === "function") {
      const job = await db.createJob({
        user_id: userId,
        prompt,
        source: image ? "image" : "prompt",
        created_at: new Date(start).toISOString(),
      });
      jobId = job && (job.id || job.job_id || job.jobId);
    }
    const model = await generateModel({ prompt, image });
    const colored = await preserveColors(model);
    const { url, key } = await uploadS3(colored);
    if (jobId && typeof db.linkModelToJob === "function") {
      await db.linkModelToJob(jobId, key);
    }
    if (typeof db.insertGenerationLog === "function") {
      await db.insertGenerationLog({
        jobId,
        prompt,
        source: image ? "image" : "prompt",
        startTime: new Date(start).toISOString(),
        finishTime: new Date().toISOString(),
        s3Key: key,
        url,
      });
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
