const fs = require("fs");
const path = require("path");

test("fallback models use local assets", () => {
  const files = [
    "js/index.js",
    "js/payment.js",
    "js/community.js",
    "js/publicGalleries.js",
    "backend/subreddit_models.json",
    "tests/pipeline.spec.ts",
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(file), "utf8");
    expect(content).toMatch(/models\/bag\.glb/);
  }
});
