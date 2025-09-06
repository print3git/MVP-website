/** @jest-environment jsdom */
const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("node:util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
const nock = require("nock");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require("jsdom");
const request = require("supertest");

let fetchAstronaut;
let fetchRepoAssets;
let download;
let app;
let loadModel;

let lastRaf;
const origRAF = global.requestAnimationFrame;
global.requestAnimationFrame = (cb) => {
  lastRaf = origRAF(cb);
  return lastRaf;
};

const MODEL_DIR = path.join("frontend", "public", "models");
const MODEL_PATH = path.join(MODEL_DIR, "astronaut.glb");
const FALLBACK_GLB =
  "https://modelviewer.dev/shared-assets/models/Astronaut.glb";

beforeAll(() => {
  ({
    fetchAstronaut,
    fetchRepoAssets,
    download,
  } = require("../../scripts/fetch-assets.cjs"));
  app = require("../../scripts/dev-server.js");
  ({ loadModel } = require("../../src/js/loadModel.js"));
});

beforeEach(() => {
  nock.cleanAll();
  delete process.env.ASTRONAUT_MODEL_URL;
  if (fs.existsSync(MODEL_PATH)) fs.unlinkSync(MODEL_PATH);
  if (fs.existsSync(MODEL_DIR)) {
    for (const f of fs.readdirSync(MODEL_DIR))
      fs.unlinkSync(path.join(MODEL_DIR, f));
  }
});

afterEach(() => {
  if (lastRaf !== undefined) {
    cancelAnimationFrame(lastRaf);
    lastRaf = undefined;
  }
});

describe("call stage", () => {
  test("issues exactly one HTTP GET to env URL", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astronaut.glb";
    const scope = nock("https://example.com")
      .get("/astronaut.glb")
      .reply(200, "model");
    await fetchAstronaut();
    expect(scope.isDone()).toBe(true);
  });

  test("uses URL verbatim", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/some%20path.glb";
    const scope = nock("https://example.com")
      .get("/some%20path.glb")
      .reply(200, "ok");
    await fetchAstronaut();
    expect(scope.isDone()).toBe(true);
  });

  test("missing env var throws and no file", async () => {
    await expect(fetchAstronaut()).rejects.toThrow();
    expect(fs.existsSync(MODEL_PATH)).toBe(false);
  });

  test("404 surfaces and no file", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://fail.test/astro.glb";
    const scope = nock("https://fail.test").get("/astro.glb").reply(404);
    await expect(fetchAstronaut()).rejects.toThrow();
    expect(fs.existsSync(MODEL_PATH)).toBe(false);
    expect(scope.isDone()).toBe(true);
  });

  test("500 surfaces", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://fail.test/astro.glb";
    const scope = nock("https://fail.test").get("/astro.glb").reply(500);
    await expect(fetchAstronaut()).rejects.toThrow();
    expect(scope.isDone()).toBe(true);
  });

  test("timeout surfaces", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://slow.test/astro.glb";
    const scope = nock("https://slow.test")
      .get("/astro.glb")
      .delayConnection(2000)
      .reply(200, "slow");
    await expect(fetchAstronaut()).rejects.toThrow();
    expect(scope.isDone()).toBe(true);
  });

  test("invalid protocol throws", async () => {
    process.env.ASTRONAUT_MODEL_URL = "ftp://example.com/astro.glb";
    await expect(fetchAstronaut()).rejects.toThrow();
  });

  test("nock expectations met", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    const scope = nock("https://example.com")
      .get("/astro.glb")
      .reply(200, "ok");
    await fetchAstronaut();
    expect(nock.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
  });

  test("does not re-download when file exists", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    const scope = nock("https://example.com")
      .get("/astro.glb")
      .once()
      .reply(200, "ok");
    await fetchAstronaut();
    await fetchAstronaut();
    expect(scope.isDone()).toBe(true);
  });

  test("changing env URL forces new request", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    let scope = nock("https://example.com").get("/astro.glb").reply(200, "ok");
    await fetchAstronaut();
    expect(scope.isDone()).toBe(true);
    process.env.ASTRONAUT_MODEL_URL = "https://other.test/astro.glb";
    scope = nock("https://other.test").get("/astro.glb").reply(200, "ok2");
    await fetchAstronaut();
    expect(scope.isDone()).toBe(true);
  });
});

describe("fetch stage", () => {
  test("creates non-empty file", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const stat = fs.statSync(MODEL_PATH);
    expect(stat.size).toBeGreaterThan(0);
  });

  test("bytes match response", async () => {
    const data = Buffer.from("matchme");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const file = fs.readFileSync(MODEL_PATH);
    expect(file.equals(data)).toBe(true);
  });

  test("replaces zero-byte placeholder", async () => {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
    fs.writeFileSync(MODEL_PATH, "");
    const data = Buffer.from("real");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const stat = fs.statSync(MODEL_PATH);
    expect(stat.size).toBe(data.length);
  });

  test("avoids rewrite when unchanged", async () => {
    const data = Buffer.from("same");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const before = fs.statSync(MODEL_PATH).mtimeMs;
    await fetchAstronaut();
    const after = fs.statSync(MODEL_PATH).mtimeMs;
    expect(after).toBe(before);
  });

  test("partial response rejects", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com")
      .get("/astro.glb")
      .reply(200, "short", { "Content-Length": "100" });
    await expect(fetchAstronaut()).rejects.toThrow();
  });

  test("concurrent fetches do not corrupt", async () => {
    const data = Buffer.from("concurrent");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").once().reply(200, data);
    await Promise.all([fetchAstronaut(), fetchAstronaut()]);
    const file = fs.readFileSync(MODEL_PATH);
    expect(file.equals(data)).toBe(true);
  });

  test("creates directory recursively", async () => {
    if (fs.existsSync(MODEL_DIR)) fs.rmdirSync(MODEL_DIR, { recursive: true });
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    expect(fs.existsSync(MODEL_PATH)).toBe(true);
  });

  test("sets readable permissions", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const mode = fs.statSync(MODEL_PATH).mode & 0o777;
    expect(mode).toBe(0o644);
  });

  test("failed download leaves file absent", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://fail.test/astro.glb";
    nock("https://fail.test").get("/astro.glb").reply(500);
    await expect(fetchAstronaut()).rejects.toThrow();
    expect(fs.existsSync(MODEL_PATH)).toBe(false);
  });

  test("deleting file allows recreation", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").twice().reply(200, data);
    await fetchAstronaut();
    fs.unlinkSync(MODEL_PATH);
    await fetchAstronaut();
    expect(fs.existsSync(MODEL_PATH)).toBe(true);
  });

  test("returns destination path", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    const p = await fetchAstronaut();
    expect(p).toBe(MODEL_PATH);
  });
});

describe("display stage", () => {
  test("dev server serves file with identical bytes", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const res = await request(app).get("/models/astronaut.glb").expect(200);
    expect(Buffer.compare(res.body, data)).toBe(0);
  });

  test("content-type is model/gltf-binary", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const res = await request(app).get("/models/astronaut.glb");
    expect(res.headers["content-type"]).toBe("model/gltf-binary");
  });

  test("cache-control no-store", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const res = await request(app).get("/models/astronaut.glb");
    expect(res.headers["cache-control"]).toBe("no-store");
  });

  test("server 404 after deletion", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").twice().reply(200, data);
    await fetchAstronaut();
    fs.unlinkSync(MODEL_PATH);
    await request(app).get("/models/astronaut.glb").expect(404);
  });

  test("re-fetch restores server response", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").twice().reply(200, data);
    await fetchAstronaut();
    fs.unlinkSync(MODEL_PATH);
    await fetchAstronaut();
    await request(app).get("/models/astronaut.glb").expect(200);
  });

  test("index.html references model once", () => {
    const dom = new JSDOM(fs.readFileSync("index.html", "utf8"));
    const els = dom.window.document.querySelectorAll(
      'model-viewer[data-model-src="models/astronaut.glb"]',
    );
    expect(els.length).toBe(1);
  });

  test("payment.html references model once", () => {
    const dom = new JSDOM(fs.readFileSync("payment.html", "utf8"));
    const els = dom.window.document.querySelectorAll(
      'model-viewer[data-model-src="models/astronaut.glb"]',
    );
    expect(els.length).toBe(1);
  });

  test("loadModel renders frames when file present", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    document.body.innerHTML =
      '<div id="viewer" style="width:100px;height:100px"></div>';
    await loadModel("models/astronaut.glb", "viewer");
    expect(window.__viewerFrames).toBeGreaterThan(0);
  });

  test("missing file falls back to remote", async () => {
    document.body.innerHTML =
      '<div id="viewer" style="width:100px;height:100px"></div>';
    await loadModel("models/astronaut.glb", "viewer");
    const mv = document.querySelector("#viewer model-viewer");
    expect(mv.getAttribute("src")).toBe(FALLBACK_GLB);
  });

  test("removing model-viewer shows degradation message", async () => {
    document.body.innerHTML =
      '<div id="viewer" style="width:100px;height:100px"></div>';
    await loadModel("models/astronaut.glb", "viewer");
    const mv = document.querySelector("#viewer model-viewer");
    mv.remove();
    expect(document.getElementById("viewer").textContent).toMatch(
      /model not available/i,
    );
  });
});

describe("pipeline integrity", () => {
  test("concurrent images and model downloads succeed", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
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
    nock("https://example.com").get("/astro.glb").reply(200, "model");
    await Promise.all([fetchRepoAssets(), fetchAstronaut()]);
    expect(fs.existsSync(MODEL_PATH)).toBe(true);
  });

  test("GLB failure does not block images", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://fail.test/astro.glb";
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
    nock("https://fail.test").get("/astro.glb").reply(500);
    await Promise.allSettled([fetchRepoAssets(), fetchAstronaut()]);
    const img = path.join("frontend", "public", "img", "astro-image.png");
    expect(fs.existsSync(img)).toBe(true);
  });

  test("build script exits non-zero on GLB failure", async () => {
    process.env.ASTRONAUT_MODEL_URL = "https://fail.test/astro.glb";
    nock("https://fail.test").get("/astro.glb").reply(500);
    const { spawnSync } = require("child_process");
    const res = spawnSync("node", ["scripts/fetch-assets.cjs"], {
      env: process.env,
    });
    expect(res.status).not.toBe(0);
  });

  test("no zero-byte files after success", async () => {
    const data = Buffer.from("abc");
    process.env.ASTRONAUT_MODEL_URL = "https://example.com/astro.glb";
    nock("https://example.com").get("/astro.glb").reply(200, data);
    await fetchAstronaut();
    const files = fs.readdirSync(MODEL_DIR);
    for (const f of files) {
      const stat = fs.statSync(path.join(MODEL_DIR, f));
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
