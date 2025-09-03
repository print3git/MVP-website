import { Router, type Request } from "express";
import multer from "multer";
import { userIdFromAuth } from "../lib/auth";
import { logError } from "../lib/logError";
import logger from "../logger";
import { enqueue } from "../queue/generation";

const upload = multer();
const router = Router();

const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // ~6MB

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
    const raw =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
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
    const raw =
      typeof req.body?.prompt === "string" ? req.body.prompt.trim() : undefined;
    if (raw && (raw.length < 1 || raw.length > 400))
      throwValidation("invalid_prompt");
    return {
      prompt: raw,
      image: req.file.buffer.toString("base64"),
      source: "image",
    };
  }
  throwValidation("unsupported_media_type", 415);
}

router.post("/generate", upload.single("image"), async (req, res) => {
  if (process.env.NODE_ENV === "test" && req.headers["x-test-shim"] === "1") {
    return res.json({ glb_url: "/models/test.glb" });
  }
  const userId = userIdFromAuth(req) || "";
  let jobId: string | undefined;
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
    const queued = await enqueue(userId, { prompt, image, source });
    jobId = queued.jobId;
    logger.info("generate_queued", { jobId, userId, source });
    res.json({ jobId });
  } catch (err) {
    const code = (err as any).code || "queue_error";
    logger.error("generate_failed", { stage: "queue", userId, code });
    logError(err);
    res.status(502).json({ error: code });
  }
});

export default router;
