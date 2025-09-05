const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const nock = require("nock");
const request = require("supertest");
const { spawnSync } = require("child_process");

let fetchRepoAssets;
let download;
let app;

const base = "https://glb-models-prod.s3.amazonaws.com";
const IMG_DIR = path.join("frontend", "public", "img");
const ASSETS = [
  "astro-image.png",
  "box logo.png",
  "luckybox-preview.png",
  "text logo.png",
];

function cleanImages() {
  fs.rmSync(IMG_DIR, { recursive: true, force: true });
}

beforeAll(async () => {
  ({ fetchRepoAssets, download } = await import(
    "../../scripts/fetch-assets.cjs"
  ));
  app = require("../../scripts/dev-server.js");
});

afterEach(() => {
  nock.cleanAll();
});

describe("call stage", () => {
  beforeEach(() => {
    cleanImages();
  });

  test.each(ASSETS)("fetchRepoAssets issues one GET for %s", async (file) => {
    const scopes = {};
    for (const f of ASSETS) {
      scopes[f] = nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    expect(scopes[file].isDone()).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  test("URL encodes spaces", async () => {
    const scope = nock(base)
      .get("/repo-assets/box%20logo.png")
      .reply(200, "box");
    for (const f of ASSETS.filter((x) => x !== "box logo.png")) {
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    expect(scope.isDone()).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  test("uses S3 host without query params", async () => {
    const scope = nock(base)
      .get("/repo-assets/astro-image.png")
      .query((q) => {
        expect(Object.keys(q).length).toBe(0);
        return true;
      })
      .reply(200, "astro");
    for (const f of ASSETS.filter((x) => x !== "astro-image.png")) {
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    expect(scope.isDone()).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  test("requests not sent to other hosts", async () => {
    const wrong = nock("https://example.com")
      .get("/repo-assets/astro-image.png")
      .reply(200, "bad");
    const scope = nock(base)
      .get("/repo-assets/astro-image.png")
      .reply(200, "astro");
    for (const f of ASSETS.filter((x) => x !== "astro-image.png")) {
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    expect(scope.isDone()).toBe(true);
    expect(wrong.isDone()).toBe(false);
    nock.cleanAll();
  });

  test("404 surfaces as empty file", async () => {
    const target = "astro-image.png";
    nock(base)
      .get(`/repo-assets/${encodeURIComponent(target)}`)
      .reply(404);
    for (const f of ASSETS.filter((x) => x !== target)) {
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    const p = path.join(IMG_DIR, target);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBe(0);
    expect(nock.isDone()).toBe(true);
  });

  test("500 surfaces as empty file", async () => {
    const target = "box logo.png";
    nock(base)
      .get(`/repo-assets/${encodeURIComponent(target)}`)
      .reply(500);
    for (const f of ASSETS.filter((x) => x !== target)) {
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, f);
    }
    await fetchRepoAssets();
    const p = path.join(IMG_DIR, target);
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.statSync(p).size).toBe(0);
    expect(nock.isDone()).toBe(true);
  });
});

describe("fetch stage", () => {
  beforeEach(() => {
    cleanImages();
  });

  test.each(ASSETS)("saves %s identically", async (file) => {
    const bodies = {};
    for (const f of ASSETS) {
      const body = Buffer.from(`data-${f}`);
      bodies[f] = body;
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, body);
    }
    await fetchRepoAssets();
    const p = path.join(IMG_DIR, file);
    expect(fs.existsSync(p)).toBe(true);
    const data = fs.readFileSync(p);
    expect(data.length).toBeGreaterThan(0);
    expect(data.equals(bodies[file])).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  test("replaces zero-byte placeholder on retry", async () => {
    const file = ASSETS[0];
    const dest = path.join(IMG_DIR, file);
    fs.mkdirSync(IMG_DIR, { recursive: true });
    fs.writeFileSync(dest, "");
    const body = Buffer.from("retry");
    nock(base)
      .get(`/repo-assets/${encodeURIComponent(file)}`)
      .reply(200, body);
    await download(`${base}/repo-assets/${encodeURIComponent(file)}`, dest);
    const data = fs.readFileSync(dest);
    expect(data.equals(body)).toBe(true);
    expect(nock.isDone()).toBe(true);
  });

  test("corrupted response creates placeholder", async () => {
    const file = ASSETS[0];
    const dest = path.join(IMG_DIR, file);
    nock(base)
      .get(`/repo-assets/${encodeURIComponent(file)}`)
      .replyWithError("boom");
    await download(`${base}/repo-assets/${encodeURIComponent(file)}`, dest);
    expect(fs.statSync(dest).size).toBe(0);
    expect(nock.isDone()).toBe(true);
  });
});

describe("display stage", () => {
  const bodies = {};
  beforeAll(async () => {
    cleanImages();
    for (const f of ASSETS) {
      const body = Buffer.from(`body-${f}`);
      bodies[f] = body;
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, body);
    }
    await fetchRepoAssets();
  });

  afterAll(() => {
    cleanImages();
  });

  test.each(ASSETS)("serves %s via dev server", async (file) => {
    const res = await request(app)
      .get(`/img/${encodeURIComponent(file)}`)
      .expect(200);
    expect(res.headers["content-type"]).toBe("image/png");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(Buffer.from(res.body).equals(bodies[file])).toBe(true);
  });

  test("returns 404 after deletion then recovers", async () => {
    const file = ASSETS[0];
    const p = path.join(IMG_DIR, file);
    fs.unlinkSync(p);
    await request(app)
      .get(`/img/${encodeURIComponent(file)}`)
      .expect(404);
    const body = Buffer.from("restored");
    nock(base)
      .get(`/repo-assets/${encodeURIComponent(file)}`)
      .reply(200, body);
    await fetchRepoAssets();
    const res = await request(app)
      .get(`/img/${encodeURIComponent(file)}`)
      .expect(200);
    expect(Buffer.from(res.body).equals(body)).toBe(true);
  });

  test("index.html references text logo once", () => {
    const dom = new JSDOM(fs.readFileSync("index.html", "utf8"));
    const imgs = dom.window.document.querySelectorAll(
      'img[src="img/text%20logo.png"]',
    );
    expect(imgs.length).toBe(1);
  });

  test("addons.html references luckybox preview once", () => {
    const dom = new JSDOM(fs.readFileSync("addons.html", "utf8"));
    const imgs = dom.window.document.querySelectorAll(
      'img[src="img/luckybox-preview.png"]',
    );
    expect(imgs.length).toBe(1);
  });

  test("CommunityCreations.html references astro image once", () => {
    const dom = new JSDOM(fs.readFileSync("CommunityCreations.html", "utf8"));
    const imgs = dom.window.document.querySelectorAll(
      'img[src="img/astro-image.png"]',
    );
    expect(imgs.length).toBe(1);
  });
});

describe("pipeline integrity", () => {
  beforeEach(() => {
    cleanImages();
  });

  test("concurrent downloads succeed", async () => {
    const bodies = {};
    const promises = [];
    for (const f of ASSETS) {
      const body = Buffer.from(`con-${f}`);
      bodies[f] = body;
      nock(base)
        .get(`/repo-assets/${encodeURIComponent(f)}`)
        .reply(200, body);
      const dest = path.join(IMG_DIR, f);
      promises.push(
        download(`${base}/repo-assets/${encodeURIComponent(f)}`, dest),
      );
    }
    await Promise.all(promises);
    for (const f of ASSETS) {
      const data = fs.readFileSync(path.join(IMG_DIR, f));
      expect(data.equals(bodies[f])).toBe(true);
    }
    expect(nock.isDone()).toBe(true);
  });

  test("failed image does not block others", async () => {
    const fail = ASSETS[0];
    for (const f of ASSETS) {
      if (f === fail) {
        nock(base)
          .get(`/repo-assets/${encodeURIComponent(f)}`)
          .reply(500);
      } else {
        nock(base)
          .get(`/repo-assets/${encodeURIComponent(f)}`)
          .reply(200, Buffer.from(`ok-${f}`));
      }
    }
    await fetchRepoAssets();
    for (const f of ASSETS) {
      const data = fs.readFileSync(path.join(IMG_DIR, f));
      if (f === fail) {
        expect(data.length).toBe(0);
      } else {
        expect(data.length).toBeGreaterThan(0);
      }
    }
    expect(nock.isDone()).toBe(true);
  });

  test("build script exits non-zero on failure", () => {
    const result = spawnSync("node", ["scripts/fetch-assets.cjs"], {
      env: { ...process.env, FETCH_ASSETS_FAIL: "1" },
    });
    expect(result.status).not.toBe(0);
  });
});
