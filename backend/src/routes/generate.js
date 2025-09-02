const { Router } = require("express");
const multer = require("multer");
const { randomUUID } = require("crypto");
const { userIdFromAuth } = require("../lib/auth.js");
const logger = require("../logger.js");
const { logError } = require("../lib/logError.js");
const { generateModel } = require("../pipeline/generateModel");
const db = require("../../db");

const upload = multer();
const router = Router();

const MAX_IMAGE_SIZE = 6 * 1024 * 1024; // ~6MB

function throwValidation(code, status = 400) {
  const err = new Error(code);
  err.status = status;
  err.code = code;
  throw err;
}

function validateInput(req) {
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
  const userId = userIdFromAuth(req) || null;
  let parsed;
  try {
    parsed = validateInput(req);
  } catch (err) {
    const code = err.code;
    logger.error("generate_failed", { stage: "validation", userId, code });
    logError(err);
    if (code === "unsupported_media_type") {
      return res.status(415).json({ error: "unsupported_media_type" });
    }
    if (code === "payload_too_large") {
      return res.status(413).json({ error: "payload_too_large" });
    }
    return res.status(400).json({ error: "bad_request", reason: code });
  }

  const { prompt, image, source } = parsed;
  try {
    let url;
    try {
      url = await generateModel({ prompt, image });
    } catch (err) {
      if (process.env.CI_REQUIRE_EXTERNAL === "0") {
        return res.json({
          glb_url: "/models/offline.glb",
          fallback: true,
          reason: "external_unavailable",
        });
      }
      throw err;
    }
    const jobId = randomUUID();
    await db.query(
      "INSERT INTO jobs(prompt, model_url, job_id, source, user_id) VALUES ($1,$2,$3,$4,$5)",
      [prompt, url, jobId, source, userId],
    );
    return res.json({ glb_url: url });
  } catch (err) {
    logger.error("generate_failed", { stage: "server", userId });
    logError(err);
    return res.status(502).json({ error: "queue_error" });
  }
});

module.exports = router;
