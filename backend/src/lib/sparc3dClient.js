"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGlb = generateGlb;
const axios_1 = require("axios");
/**
 * Generate a GLB model from a text prompt and optional image URL using
 * the Sparc3D API.
 *
 * @param options prompt text and optional image URL
 * @returns model data as a Buffer
 */
async function generateGlb({ prompt, imageURL }) {
    const endpoint = process.env.SPARC3D_ENDPOINT;
    const token = process.env.SPARC3D_TOKEN;
    if (!endpoint)
        throw new Error("Missing SPARC3D_ENDPOINT environment variable");
    if (!token)
        throw new Error("Missing SPARC3D_TOKEN environment variable");
    const payload = { prompt };
    if (imageURL)
        payload.image_url = imageURL;
    const res = await axios_1.default.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
        validateStatus: () => true,
    });
    if (res.status >= 400) {
        const msg = (typeof res.data === "object" && res.data && res.data.error) ||
            (typeof res.data === "string" ? res.data : `status ${res.status}`);
        throw new Error(`SPARC3D request failed (${msg})`);
    }
    return Buffer.from(res.data);
}
