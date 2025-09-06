const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

let fetchRepoAssets;

const IMG_DIR = path.join("frontend", "public", "img");
const ASSETS = [
  "astro-image.png",
  "box logo.png",
  "luckybox-preview.png",
  "text logo.png",
];
const BASE_URL = "https://glb-models-prod.s3.amazonaws.com/repo-assets";

beforeAll(async () => {
  ({ fetchRepoAssets } = await import("../../scripts/fetch-assets.cjs"));
  for (const file of ASSETS) {
    const p = path.join(IMG_DIR, file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe("live S3 assets", () => {
  test("S3 endpoints respond with image data", async () => {
    for (const file of ASSETS) {
      const url = `${BASE_URL}/${encodeURIComponent(file)}`;
      const res = await fetch(url, { method: "HEAD" });
      expect(res.status).toBe(200);
      const len = Number(res.headers.get("content-length"));
      expect(len).toBeGreaterThan(0);
      expect(res.headers.get("content-type")).toMatch(/^image\//);
    }
  });

  test("downloads non-empty images without mocks", async () => {
    await fetchRepoAssets();
    for (const file of ASSETS) {
      const p = path.join(IMG_DIR, file);
      expect(fs.existsSync(p)).toBe(true);
      const size = fs.statSync(p).size;
      expect(size).toBeGreaterThan(0);
    }
  });

  test("html pages reference existing images", () => {
    const indexDom = new JSDOM(fs.readFileSync("index.html", "utf8"));
    const addonsDom = new JSDOM(fs.readFileSync("addons.html", "utf8"));
    const communityDom = new JSDOM(
      fs.readFileSync("CommunityCreations.html", "utf8"),
    );

    const refs = [
      indexDom.window.document.querySelector('img[src="img/text%20logo.png"]'),
      indexDom.window.document.querySelector('img[src="img/box%20logo.png"]'),
      addonsDom.window.document.querySelector(
        'img[src="img/luckybox-preview.png"]',
      ),
      communityDom.window.document.querySelector(
        'img[src="img/astro-image.png"]',
      ),
    ];

    refs.forEach((ref, i) => {
      expect(ref).not.toBeNull();
      const file = ASSETS[i];
      const p = path.join(IMG_DIR, file);
      const size = fs.statSync(p).size;
      expect(size).toBeGreaterThan(0);
    });
  });
});
