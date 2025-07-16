import fs from "fs";
import path from "path";
import { uploadFile } from "./uploadS3";

/**
 * Ensure an image is available via HTTP and return the URL.
 * If the input is already an HTTP/HTTPS URL it is returned as-is.
 * Data URLs and local file paths are uploaded to S3.
 */
export async function prepareImage(image: string): Promise<string> {
  if (/^https?:\/\//.test(image)) {
    return image;
  }

  let filePath = image;
  let cleanup = false;

  if (image.startsWith("data:")) {
    const [, base64] = image.split(",", 2);
    filePath = path.join(
      "/tmp",
      `${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
    );
    await fs.promises.writeFile(filePath, Buffer.from(base64, "base64"));
    cleanup = true;
  } else {
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(normalized);
    const uploadsDir = path.resolve("uploads");
    if (!resolved.startsWith("/tmp") && !resolved.startsWith(uploadsDir)) {
      throw new Error("image file not found");
    }
    if (!fs.existsSync(resolved)) {
      throw new Error("image file not found");
    }
    filePath = resolved;
  }

  try {
    return await uploadFile(filePath, "image/png");
  } finally {
    if (cleanup) fs.unlink(filePath, () => {});
  }
}
