const fs = require("fs");
const path = require("path");
const nock = require("nock");

let fetchRepoAssets;

const IMG_DIR = path.join("frontend", "public", "img");
const ASSETS = [
  "astro-image.png",
  "box logo.png",
  "luckybox-preview.png",
  "text logo.png",
];

beforeAll(async () => {
  ({ fetchRepoAssets } = await import("../../scripts/fetch-assets.cjs"));
});

test("existing repo assets are non-empty without network", async () => {
  nock.disableNetConnect();
  try {
    await fetchRepoAssets();
  } finally {
    nock.enableNetConnect();
  }

  for (const file of ASSETS) {
    const filePath = path.join(IMG_DIR, file);
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(0);
  }
});
