import axios from "axios";
import fs from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { uploadFile } from "./uploadS3";
import { capture } from "./logger";
import logger from "../../src/logger";

/**
 * Generate an image from text using Stability AI and upload to S3.
 * @param {string} prompt text prompt
 * @returns {Promise<string>} Public URL of generated PNG
 */
export async function textToImage(prompt: string): Promise<string> {
  const key = process.env.STABILITY_KEY;
  if (!key) throw new Error("STABILITY_KEY is not set");
  const endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core";
  try {
    let res;
    try {
      res = await axios.post(
        endpoint,
        { text_prompts: [{ text: prompt }], output_format: "png" },
        {
          headers: { Authorization: `Bearer ${key}` },
          responseType: "stream",
          validateStatus: () => true,
        },
      );
    } catch (err: any) {
      logger.error(
        JSON.stringify({
          step: "textToImage-fetch",
          error: err.message,
          stack: err.stack,
        }),
      );
      throw err;
    }

    if (res.status >= 400) {
      const msg = res.data?.error || `request failed with status ${res.status}`;
      throw new Error(msg);
    }

    const tmpPath = path.join(
      "/tmp",
      `${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
    );
    await pipeline(res.data, fs.createWriteStream(tmpPath));
    try {
      return await uploadFile(tmpPath, "image/png");
    } finally {
      fs.unlink(tmpPath, () => {});
    }
  } catch (err) {
    capture(err);
    throw err;
  }
}
