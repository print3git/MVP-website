// Enforce 1:1 crop + neutral BG for all images.
//
// Tasks:
// 1. Use sharp (npm) to:
//    a. Resize longest side to 400px.
//    b. Extend canvas to square with transparent BG if needed.
//    c. Flatten onto #1e1e1e background.
// 2. Save as JPEG 80% quality (<60 KB).
// 3. Reject upload if final dims \u2260 400\u00d7400.
// 4. Export async function processThumbnail(fileBuffer) \u2192 { ok, buffer, error }.

const sharp = require("sharp");

/**
 * Process an uploaded thumbnail image according to repository standards.
 * @param {Buffer} fileBuffer Raw image data
 * @returns {Promise<{ok: boolean, buffer?: Buffer, error?: string}>} Processed image result
 */
async function processThumbnail(fileBuffer) {
  try {
    const image = sharp(fileBuffer, { failOnError: true });
    const meta = await image.metadata();
    const resized = image.resize({
      width: meta.width >= meta.height ? 400 : null,
      height: meta.height > meta.width ? 400 : null,
      fit: "inside",
    });
    const resizedBuffer = await resized.toBuffer();
    const { width, height } = await sharp(resizedBuffer).metadata();

    const square = await sharp(resizedBuffer)
      .extend({
        top: 0,
        left: 0,
        bottom: 400 - height,
        right: 400 - width,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .flatten({ background: "#1e1e1e" })
      .jpeg({ quality: 80 });

    const buffer = await square.toBuffer();
    const final = await sharp(buffer).metadata();
    if (final.width !== 400 || final.height !== 400) {
      return { ok: false, error: "Invalid dimensions" };
    }
    if (buffer.length > 60000) {
      return { ok: false, error: "File too large" };
    }
    return { ok: true, buffer };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { processThumbnail };
