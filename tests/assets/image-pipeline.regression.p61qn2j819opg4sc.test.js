const fs = require("fs");
const path = require("path");
const { TextEncoder, TextDecoder } = require("node:util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
const { JSDOM } = require("jsdom");
const request = require("supertest");
const { Readable } = require("stream");
const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

let fetchRepoAssets;
let app;

const IMG_DIR = path.join("frontend", "public", "img");
const ASSETS = [
  "astro-image.png",
  "box logo.png",
  "luckybox-preview.png",
  "text logo.png",
];
const s3Mock = mockClient(S3Client);

function cleanImages() {
  fs.rmSync(IMG_DIR, { recursive: true, force: true });
}

beforeAll(async () => {
  ({ fetchRepoAssets } = await import("../../scripts/fetch-assets.cjs"));
  app = require("../../scripts/dev-server.js");
});

describe("call stage", () => {
  beforeEach(() => {
    s3Mock.reset();
    cleanImages();
  });
  test.each(ASSETS)("fetchRepoAssets downloads %s", async (file) => {
    s3Mock
      .on(GetObjectCommand, { Bucket: "repo-assets", Key: file })
      .resolves({ Body: Readable.from(file) });
    await fetchRepoAssets();
    const calls = s3Mock.commandCalls(GetObjectCommand, {
      Bucket: "repo-assets",
      Key: file,
    });
    expect(calls.length).toBe(1);
  });

  test("throws on missing object", async () => {
    s3Mock
      .on(GetObjectCommand, { Bucket: "repo-assets", Key: ASSETS[0] })
      .rejects(new Error("NotFound"));
    await expect(fetchRepoAssets()).rejects.toThrow();
    expect(fs.existsSync(path.join(IMG_DIR, ASSETS[0]))).toBe(false);
  });
});

describe("display stage", () => {
  const bodies = {};
  beforeAll(async () => {
    cleanImages();
    for (const f of ASSETS) {
      const body = Buffer.from(`body-${f}`);
      bodies[f] = body;
      s3Mock
        .on(GetObjectCommand, { Bucket: "repo-assets", Key: f })
        .resolves({ Body: Readable.from(body) });
    }
    await fetchRepoAssets();
  });

  test.each(ASSETS)("serves %s via dev server", async (file) => {
    const res = await request(app)
      .get(`/img/${encodeURIComponent(file)}`)
      .expect(200);
    expect(Buffer.from(res.body).equals(bodies[file])).toBe(true);
  });

  test("index.html references text logo once", () => {
    const dom = new JSDOM(fs.readFileSync("index.html", "utf8"));
    const imgs = dom.window.document.querySelectorAll(
      'img[src="img/text%20logo.png"]',
    );
    expect(imgs.length).toBe(1);
  });

  afterAll(() => {
    s3Mock.reset();
    cleanImages();
  });
});

describe("pipeline integrity", () => {
  beforeEach(() => {
    s3Mock.reset();
    cleanImages();
  });
  test("concurrent downloads succeed", async () => {
    const bodies = {};
    for (const f of ASSETS) {
      const body = Buffer.from(`con-${f}`);
      bodies[f] = body;
      s3Mock
        .on(GetObjectCommand, { Bucket: "repo-assets", Key: f })
        .resolves({ Body: Readable.from(body) });
    }
    await fetchRepoAssets();
    for (const f of ASSETS) {
      const data = fs.readFileSync(path.join(IMG_DIR, f));
      expect(data.equals(bodies[f])).toBe(true);
    }
  });

  test("fetchRepoAssets surfaces errors", async () => {
    s3Mock
      .on(GetObjectCommand, { Bucket: "repo-assets", Key: ASSETS[0] })
      .rejects(new Error("boom"));
    await expect(fetchRepoAssets()).rejects.toThrow();
  });
});
