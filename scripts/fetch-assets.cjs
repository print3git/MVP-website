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
  const url = process.env.BOOMBOX_MODEL_URL;

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
    console.warn("BOOMBOX_MODEL_URL not set; creating placeholder file");
    await ensureDir(dest);
    await writeFile(dest, "");
    return;
  }

  await download(url, dest);
}

let astronautPromise;
let lastAstronautUrl;

let retryLogger = (msg) => console.warn(msg);
function setRetryLogger(fn) {
  retryLogger = fn;
}

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
      const attempts = 3;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        let expected;
        let bytes = 0;
        const start = Date.now();
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 10000).unref();
        try {
          const res = await fetch(url, { signal: ac.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          expected = res.headers.get("content-length");
          if (!expected) {
            retryLogger(`attempt ${attempt}: missing Content-Length`);
          }
          const counter = new Transform({
            transform(chunk, enc, cb) {
              bytes += chunk.length;
              cb(null, chunk);
            },
          });
          await ensureDir(dest);
          await pipeline(
            res.body,
            counter,
            createWriteStream(dest, { mode: 0o644 }),
          );
          const elapsed = Date.now() - start;
          if (expected && Number(expected) !== bytes) {
            retryLogger(
              `attempt ${attempt}: expected ${expected} bytes, received ${bytes} in ${elapsed}ms`,
            );
            throw new Error("incomplete response");
          }
          lastAstronautUrl = url;
          return dest;
        } catch (err) {
          await unlink(dest).catch(() => {});
          if (err && err.name === "AbortError") {
            err = new Error("incomplete response");
          }
          if (attempt === attempts) {
            lastAstronautUrl = undefined;
            throw err;
          }
          const elapsed = Date.now() - start;
          retryLogger(
            `Retrying astronaut download (${attempt}): ${err}; received ${bytes} of ${expected ?? "?"} bytes after ${elapsed}ms`,
          );
        } finally {
          clearTimeout(timer);
        }
      }
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
  fetchAstronaut,
  setRetryLogger,
};

if (require.main === module) {
  (async () => {
    if (process.env.FETCH_ASSETS_FAIL === "1") {
      throw new Error("forced failure");
    }
    await fetchAstronaut();
    await fetchBoombox();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
