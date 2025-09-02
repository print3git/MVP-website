"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.textToImage = textToImage;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("stream/promises");
const path_1 = __importDefault(require("path"));
const uploadS3_1 = require("./uploadS3");
/**
 * Generate an image from text using Stability AI and upload to S3.
 * @param {string} prompt text prompt
 * @returns {Promise<string>} Public URL of generated PNG
 */
async function textToImage(prompt) {
  const key = process.env.STABILITY_KEY;
  if (!key) throw new Error("STABILITY_KEY is not set");
  const endpoint = "https://api.stability.ai/v2beta/stable-image/generate/core";
  const res = await axios_1.default.post(
    endpoint,
    { text_prompts: [{ text: prompt }], output_format: "png" },
    {
      headers: { Authorization: `Bearer ${key}` },
      responseType: "stream",
      validateStatus: () => true,
    },
  );
  if (res.status >= 400) {
    const msg = res.data?.error || `request failed with status ${res.status}`;
    throw new Error(msg);
  }
  const tmpPath = path_1.default.join(
    "/tmp",
    `${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
  );
  await (0, promises_1.pipeline)(
    res.data,
    fs_1.default.createWriteStream(tmpPath),
  );
  try {
    return await (0, uploadS3_1.uploadFile)(tmpPath, "image/png");
  } finally {
    fs_1.default.unlink(tmpPath, () => {});
  }
}
