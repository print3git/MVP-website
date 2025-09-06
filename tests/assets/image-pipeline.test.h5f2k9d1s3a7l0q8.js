const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("node:util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
const { JSDOM } = require("jsdom");
const nock = require("nock");
const request = require("supertest");

let fetchRepoAssets;
let fetchBoombox;
let download;
let app;

const IMG_DIR = path.join("frontend", "public", "img");
const ASSETS = [
  "astro-image.png",
  "box logo.png",
  "luckybox-preview.png",
  "text logo.png",
];

beforeAll(async () => {
  ({ fetchRepoAssets, fetchBoombox, download } = await import(
    "../../scripts/fetch-assets.cjs"
  ));
  app = require("../../scripts/dev-server.js");
  for (const file of ASSETS) {
    const p = path.join(IMG_DIR, file);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const boombox = path.join("frontend", "public", "models", "boombox.glb");
  if (fs.existsSync(boombox)) fs.unlinkSync(boombox);

  const base = "https://glb-models-prod.s3.amazonaws.com";
  nock(base)
    .get("/repo-assets/astro-image.png")
    .reply(200, "astro")
    .get("/repo-assets/box%20logo.png")
    .reply(200, "box")
    .get("/repo-assets/luckybox-preview.png")
    .reply(200, "lucky")
    .get("/repo-assets/text%20logo.png")
    .reply(200, "text");

  process.env.BOOMBOX_MODEL_URL = "https://example.com/boombox.glb";
  nock("https://example.com").get("/boombox.glb").reply(200, "model");

  await fetchBoombox();
  await fetchRepoAssets();
});

describe("download step", () => {
  for (const file of ASSETS) {
    test(`downloads ${file}`, () => {
      const p = path.join(IMG_DIR, file);
      expect(fs.existsSync(p)).toBe(true);
      const data = fs.readFileSync(p, "utf8");
      expect(data.length).toBeGreaterThan(0);
    });
  }

  test("throws and leaves no file when download fails", async () => {
    nock("https://fail.test").get("/missing.png").reply(404);
    const dest = path.join(IMG_DIR, "missing.png");
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await expect(
      download("https://fail.test/missing.png", dest),
    ).rejects.toThrow();
    expect(fs.existsSync(dest)).toBe(false);
  });

  test("boombox placeholder when env missing", async () => {
    delete process.env.BOOMBOX_MODEL_URL;
    const dest = path.join("frontend", "public", "models", "boombox.glb");
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    await fetchBoombox();
    expect(fs.existsSync(dest)).toBe(true);
    const stat = fs.statSync(dest);
    expect(stat.size).toBe(0);
  });
});

describe("serving step", () => {
  for (const file of ASSETS) {
    test(`serves ${file}`, async () => {
      await request(app)
        .get(`/img/${encodeURIComponent(file)}`)
        .expect(200);
    });
  }
});

describe("html references", () => {
  test("index.html references text and box logos", () => {
    const dom = new JSDOM(fs.readFileSync("index.html", "utf8"));
    const textLogo = dom.window.document.querySelector(
      'img[src="img/text logo.png"]',
    );
    const boxLogo = dom.window.document.querySelector(
      'img[src="img/box logo.png"]',
    );
    expect(textLogo).not.toBeNull();
    expect(boxLogo).not.toBeNull();
  });

  test("addons page references luckybox preview", () => {
    const dom = new JSDOM(fs.readFileSync("addons.html", "utf8"));
    const img = dom.window.document.querySelector(
      'img[src="img/luckybox-preview.png"]',
    );
    expect(img).not.toBeNull();
  });

  test("community page references astro image", () => {
    const dom = new JSDOM(fs.readFileSync("CommunityCreations.html", "utf8"));
    const img = dom.window.document.querySelector(
      'img[src="img/astro-image.png"]',
    );
    expect(img).not.toBeNull();
  });
});
