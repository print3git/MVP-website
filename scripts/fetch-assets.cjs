const { mkdir, writeFile } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { dirname, join } = require("node:path");

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function download(url, dest) {
  try {
    const axios = require("axios");
    const res = await axios.get(url, { responseType: "arraybuffer" });
    const buf = Buffer.from(res.data);
    await ensureDir(dest);
    await writeFile(dest, buf);
    console.log(`Downloaded ${url}`);
  } catch (err) {
    console.warn(`Failed to download ${url}: ${err}. Creating placeholder.`);
    await ensureDir(dest);
    await writeFile(dest, "");
  }
}

async function fetchBoombox() {
  const dest = join("frontend", "public", "models", "boombox.glb");
  const url = process.env.BOOMBOX_MODEL_URL;

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

  await download(url, dest);
}

async function fetchRepoAssets() {
  const base = "https://glb-models-prod.s3.amazonaws.com/repo-assets";
  const files = [
    "astro-image.png",
    "box logo.png",
    "luckybox-preview.png",
    "text logo.png",
  ];

  for (const file of files) {
    const dest = join("frontend", "public", "img", file);
    if (existsSync(dest)) {
      console.log(`${file} already present`);
      continue;
    }
    const url = `${base}/${encodeURIComponent(file)}`;
    await download(url, dest);
  }
}

module.exports = { ensureDir, download, fetchBoombox, fetchRepoAssets };

if (require.main === module) {
  (async () => {
    if (process.env.FETCH_ASSETS_FAIL === "1") {
      throw new Error("forced failure");
    }
    await fetchBoombox();
    await fetchRepoAssets();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
