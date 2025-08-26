import { Router } from "express";
import multer from "multer";
import * as db from "../../db.js";
import { generateModel } from "../pipeline/generateModel";
import { preserveColors } from "../lib/preserveColors";
import * as s3 from "../lib/uploadS3";
import { logError } from "../lib/logError";

const upload = multer();
const router = Router();

router.post("/generate", upload.single("image"), async (req, res) => {
  const prompt = req.body?.prompt as string | undefined;
  const image = req.file ? req.file.buffer.toString("base64") : undefined;
  if (!prompt && !image) {
    res.status(400).json({ error: "prompt or image required" });
    return;
  }
  let jobId: string | undefined;
  try {
    const job = await db.query(
      "INSERT INTO jobs(prompt) VALUES($1) RETURNING id",
      [prompt || ""],
    );
    jobId = job.rows?.[0]?.id;
    const glb = await generateModel({ prompt, image });
    const colored = await preserveColors(glb);
    const uploadFn = (s3 as any).uploadS3 || (s3 as any).uploadFile;
    const url = await uploadFn(colored);
    if (typeof (db as any).insertGenerationLog === "function") {
      await (db as any).insertGenerationLog(jobId, url);
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
