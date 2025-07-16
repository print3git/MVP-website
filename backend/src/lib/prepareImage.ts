import fs from "fs";
import path from "path";

function safeJoin(base: string, userPath: string) {
  const target = path.normalize(
    path.isAbsolute(userPath) ? userPath : path.join(base, userPath),
  );
  if (!target.startsWith(path.normalize(base + path.sep))) {
    throw new Error("Invalid path");
  }
  return target;
}
import { uploadFile } from "./uploadS3";
import { resolveLocalFile } from "./fileUtils";

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
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    filePath = safeJoin("/tmp", name);
    await fs.promises.writeFile(filePath, Buffer.from(base64, "base64"));
    cleanup = true;
  } else {
    filePath = resolveLocalFile(
      filePath,
      ["/tmp", "uploads"],
      "image file not found",
    );
  }

  try {
    return await uploadFile(filePath, "image/png");
  } finally {
    if (cleanup) fs.unlink(filePath, () => {});
  }
}
