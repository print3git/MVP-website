import { Router } from "express";
import multer from "multer";
import * as db from "../../db.js";
import { generateModel } from "../pipeline/generateModel";
import { logError } from "../lib/logError";

const upload = multer();
const router = Router();

router.post("/api/generate", upload.single("image"), async (req, res) => {
  const prompt = req.body?.prompt as string | undefined;
  const image = req.file ? req.file.buffer.toString("base64") : undefined;
  if (!prompt && !image) {
    res.status(400).json({ error: "prompt or image required" });
    return;
  }
  try {
    const glb_url = await generateModel({ prompt, image });
    await db.query("INSERT INTO jobs(prompt) VALUES($1)", [prompt || ""]);
    if (typeof (db as any).insertGenerationLog === "function") {
      await (db as any).insertGenerationLog();
    }
    res.json({ glb_url });
  } catch (err) {
    logError(err);
    if (process.env.CI_REQUIRE_EXTERNAL) {
      res.status(500).json({ error: "Generation failed" });
      return;
    }
    res.json({ glb_url: "/fallback.glb" });
  }
});

export default router;
