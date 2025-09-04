import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const dest = join("frontend", "public", "models", "boombox.glb");
const url = process.env.BOOMBOX_MODEL_URL;

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function download() {
  if (existsSync(dest)) {
    console.log("boombox model already present");
    return;
  }

  if (!url) {
    console.warn("BOOMBOX_MODEL_URL not set; creating placeholder file");
    await ensureDir(dest);
    await writeFile(dest, "");
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await ensureDir(dest);
    await writeFile(dest, buf);
    console.log("boombox model downloaded");
  } catch (err) {
    console.warn(`Failed to download model: ${err}. Creating placeholder.`);
    await ensureDir(dest);
    await writeFile(dest, "");
  }
}

download().catch((err) => {
  console.error(err);
  process.exit(1);
});
