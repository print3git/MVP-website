"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGlb = generateGlb;
const axios_1 = __importDefault(require("axios"));
/**
 * Generate a GLB model using the Sparc3D API.
 *
 * @param options - generation parameters
 * @param options.prompt - text prompt
 * @param options.imageURL - optional image URL
 * @returns raw .glb bytes as a Buffer
 */
async function generateGlb({ prompt, imageURL }) {
  const endpoint = process.env.SPARC3D_ENDPOINT;
  const token = process.env.SPARC3D_TOKEN;
  if (!endpoint) {
    throw new Error("SPARC3D_ENDPOINT is not set");
  }
  if (!token) {
    throw new Error("SPARC3D_TOKEN is not set");
  }
  try {
    const res = await axios_1.default.post(
      endpoint,
      { prompt, ...(imageURL ? { imageURL } : {}) },
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        validateStatus: () => true,
      },
    );
    if (res.status >= 400) {
      let errMsg = `SPARC3D request failed with status ${res.status}`;
      try {
        const json = JSON.parse(Buffer.from(res.data).toString("utf8"));
        if (json && json.error) errMsg = json.error;
      } catch {
        // ignore parse errors
      }
      throw new Error(errMsg);
    }
    return Buffer.from(res.data);
  } catch (err) {
    throw new Error(`SPARC3D request failed: ${err.message}`);
  }
}
