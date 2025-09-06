const fs = require("fs");
const path = require("path");
const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

let fetchRepoAssets;
const s3Mock = mockClient(S3Client);

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

beforeEach(() => {
  s3Mock.reset();
});

test("existing repo assets are non-empty without network", async () => {
  await fetchRepoAssets();
  expect(s3Mock.commandCalls(GetObjectCommand).length).toBe(0);

  for (const file of ASSETS) {
    const filePath = path.join(IMG_DIR, file);
    expect(fs.existsSync(filePath)).toBe(true);
    const stat = fs.statSync(filePath);
    expect(stat.size).toBeGreaterThan(0);
  }
});
