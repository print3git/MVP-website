import { Router } from "express";
import multer from "multer";
import * as db from "../../db.js";
import { userIdFromAuth } from "../lib/auth";
import { generateModel } from "../lib/generateModel";
import { preserveColors } from "../lib/preserveColors";
import { uploadS3 } from "../lib/uploadS3";
import { logError } from "../lib/logError";

const upload = multer();
const router = Router();

router.post("/generate", upload.single("image"), async (req, res) => {
  const prompt =
    typeof req.body?.prompt === "string" ? req.body.prompt : undefined;
  const image = req.file ? req.file.buffer.toString("base64") : undefined;
  if (!prompt && !image) {
    res.status(400).json({ error: "bad_request" });
    return;
  }

  const userId = userIdFromAuth(req);
  let jobId: string | undefined;
  const start = Date.now();

  try {
    if (typeof (db as any).createJob === "function") {
      const job = await (db as any).createJob({
        user_id: userId,
        prompt,
        source: image ? "image" : "prompt",
        created_at: new Date(start).toISOString(),
      });
      jobId = job?.id || job?.job_id || job?.jobId;
    }

    const model = await generateModel({ prompt, image });
    const colored = await preserveColors(model);
    const { url, key } = await uploadS3(colored);

    if (jobId && typeof (db as any).linkModelToJob === "function") {
      await (db as any).linkModelToJob(jobId, key);
    }
    if (typeof (db as any).insertGenerationLog === "function") {
      await (db as any).insertGenerationLog({
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

export default router;
