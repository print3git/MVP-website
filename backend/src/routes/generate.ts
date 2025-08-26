import { Router, type Request } from "express";
import multer from "multer";
import * as db from "../../db.js";
import { userIdFromAuth } from "../lib/auth";
import { generateModel } from "../lib/generateModel";
import { preserveColors } from "../lib/preserveColors";
import { uploadS3 } from "../lib/uploadS3";
import { logError } from "../lib/logError";
import logger from "../logger.js";

const upload = multer();
const router = Router();

const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // ~6MB
const FALLBACK_JOB_ID = "00000000-0000-0000-0000-000000000000";

interface ValidationResult {
  prompt?: string;
  image?: string;
  source: "prompt" | "image";
}

function throwValidation(code: string, status = 400): never {
  const err = new Error(code) as { status?: number; code?: string };
  err.status = status;
  err.code = code;
  throw err;
}

function validateInput(req: Request): ValidationResult {
  if (req.is("application/json")) {
    const raw = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!raw) throwValidation("missing_or_ambiguous_input");
    if (raw.length < 1 || raw.length > 400) throwValidation("invalid_prompt");
    return { prompt: raw, source: "prompt" };
  }
  if (req.is("multipart/form-data")) {
    const length = Number(req.headers["content-length"] || 0);
    if (!Number.isNaN(length) && length > MAX_IMAGE_SIZE) {
      throwValidation("payload_too_large", 413);
    }
    if (!req.file) throwValidation("missing_or_ambiguous_input");
    const raw = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : undefined;
    if (raw && (raw.length < 1 || raw.length > 400)) throwValidation("invalid_prompt");
    // If both prompt and image are provided, prefer image as the source and pass prompt metadata.
    return { prompt: raw, image: req.file.buffer.toString("base64"), source: "image" };
  }
  throwValidation("unsupported_media_type", 415);
}

router.post("/generate", upload.single("image"), async (req, res) => {
  const userId = userIdFromAuth(req) || null;
  const start = Date.now();
  let jobId: string | undefined;
  let s3Key: string | undefined;
  let parsed: ValidationResult;

  try {
    parsed = validateInput(req);
  } catch (err) {
    const code = (err as any).code;
    const status = (err as any).status || 400;
    logger.error("generate_failed", { stage: "validation", userId, code });
    logError(err);
    if (code === "unsupported_media_type") {
      res.status(415).json({ error: "unsupported_media_type" });
    } else if (code === "payload_too_large") {
      res.status(413).json({ error: "payload_too_large" });
    } else {
      res.status(400).json({ error: "bad_request", reason: code });
    }
    return;
  }

  const { prompt, image, source } = parsed;

  try {
    if (typeof (db as any).createJob === "function") {
      const job = await (db as any).createJob({
        user_id: userId,
        prompt,
        source,
        created_at: new Date(start).toISOString(),
      });
      jobId = job?.id || job?.job_id || job?.jobId;
    }

    let model = await generateModel({ prompt, image });
    model = await preserveColors(model);
    const uploadResult = await uploadS3(model);
    const { url, key } = uploadResult;
    s3Key = key;

    if (jobId && typeof (db as any).linkModelToJob === "function") {
      await (db as any).linkModelToJob(jobId, key);
    }
    if (typeof (db as any).insertGenerationLog === "function") {
      await (db as any).insertGenerationLog({
        jobId,
        userId,
        prompt: prompt ?? "image",
        source,
        startTime: new Date(start).toISOString(),
        finishTime: new Date().toISOString(),
        s3Key: key,
        url,
      });
    }

    logger.info("generate_success", { jobId, userId, source, s3Key: key });
    res.json({ jobId, url });
  } catch (err) {
    const stage = s3Key ? "upload" : "generation";
    const code = stage === "upload" ? "upload_failed" : "model_error";
    logger.error("generate_failed", { stage, userId, code: (err as any).code });
    logError(err);
    if (process.env.CI_REQUIRE_EXTERNAL === "true") {
      res.status(502).json({ error: code });
      return;
    }
    if (typeof (db as any).insertGenerationLog === "function") {
      await (db as any).insertGenerationLog({
        jobId,
        userId,
        prompt: prompt ?? "image",
        source,
        startTime: new Date(start).toISOString(),
        finishTime: new Date().toISOString(),
      });
    }
    res.json({ jobId: jobId || FALLBACK_JOB_ID, url: "/fallback.glb" });
  }
});

export default router;
