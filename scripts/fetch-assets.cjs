const { mkdir, writeFile, stat, unlink } = require("node:fs/promises");
const { existsSync, createWriteStream } = require("node:fs");
const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");
const { dirname, join } = require("node:path");
async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function download(url, dest) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await ensureDir(dest);
    await pipeline(res.body, createWriteStream(dest));
    console.log(`Downloaded ${url}`);
  } catch (err) {
    console.warn(`Failed to download ${url}: ${err}`);
    throw err;
  }
}

async function fetchBoombox() {
  const dest = join("frontend", "public", "models", "boombox.glb");
  const url = process.env.BOOMBOX_GLB_URL;

  if (existsSync(dest)) {
    const size = await stat(dest)
      .then((s) => s.size)
      .catch(() => 0);
    if (size > 0) {
      console.log("boombox model already present");
      return;
    }
  }

  if (!url) {
    console.warn("BOOMBOX_GLB_URL not set; creating placeholder file");
    await ensureDir(dest);
    await writeFile(dest, "");
    return;
  }

  await download(url, dest);
}

module.exports = {
  ensureDir,
  download,
  fetchBoombox,
};

if (require.main === module) {
  (async () => {
    if (process.env.FETCH_ASSETS_FAIL === "1") {
      throw new Error("forced failure");
    }
    await fetchBoombox();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
