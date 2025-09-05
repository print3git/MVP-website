import { mkdir, writeFile, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

export async function ensureDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function download(url, dest) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await ensureDir(dest);
    await writeFile(dest, buf);
    console.log(`Downloaded ${url}`);
  } catch (err) {
    console.warn(`Failed to download ${url}: ${err}. Creating placeholder.`);
    await ensureDir(dest);
    await writeFile(dest, "");
  }
}

async function linkToRootImg(file) {
  const src = join("frontend", "public", "img", file);
  const dest = join("img", file);
  if (existsSync(dest)) {
    return;
  }
  await ensureDir(dest);
  try {
    await symlink(src, dest);
  } catch (err) {
    if (err.code !== "EEXIST") {
      throw err;
    }
  }
}

export async function fetchBoombox() {
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

export async function fetchRepoAssets() {
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
    } else {
      const url = `${base}/${encodeURIComponent(file)}`;
      await download(url, dest);
    }
    await linkToRootImg(file);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await fetchBoombox();
  await fetchRepoAssets();
}
