const { mkdir, writeFile, stat, unlink } = require("node:fs/promises");
const { existsSync, createWriteStream } = require("node:fs");
const { pipeline } = require("node:stream/promises");
const { dirname, join } = require("node:path");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

const s3 = new S3Client();

async function downloadFromS3(bucket, key, dest) {
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    await ensureDir(dest);
    await pipeline(Body, createWriteStream(dest));
    console.log(`Downloaded s3://${bucket}/${key}`);
  } catch (err) {
    console.warn(`Failed to download s3://${bucket}/${key}: ${err}`);
    throw err;
  }
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
  const bucket = "repo-assets";
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
    await downloadFromS3(bucket, file, dest);
  }
}

let astronautPromise;
let lastAstronautUrl;

async function fetchAstronaut() {
  const dest = join("frontend", "public", "models", "astronaut.glb");
  const url = process.env.ASTRONAUT_MODEL_URL;

  if (!url) {
    await unlink(dest).catch(() => {});
    throw new Error("ASTRONAUT_MODEL_URL not set");
  }

  try {
    const s = await stat(dest);
    if (s.size > 0 && url === lastAstronautUrl) {
      console.log("astronaut model already present");
      return dest;
    }
  } catch {
    // file missing; proceed
  }

  if (astronautPromise) return astronautPromise;

  astronautPromise = (async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const cl = res.headers.get("content-length");
      if (cl && Number(cl) !== buf.length) {
        throw new Error("incomplete response");
      }
      await ensureDir(dest);
      await writeFile(dest, buf, { mode: 0o644 });
      lastAstronautUrl = url;
      return dest;
    } catch (err) {
      await unlink(dest).catch(() => {});
      lastAstronautUrl = undefined;
      throw err;
    } finally {
      astronautPromise = null;
    }
  })();

  return astronautPromise;
}

module.exports = {
  ensureDir,
  download,
  fetchBoombox,
  fetchRepoAssets,
  fetchAstronaut,
};

if (require.main === module) {
  (async () => {
    if (process.env.FETCH_ASSETS_FAIL === "1") {
      throw new Error("forced failure");
    }
    await fetchAstronaut();
    await fetchBoombox();
    await fetchRepoAssets();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
