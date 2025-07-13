const fs = require("fs");
const path = require("path");

describe("frontend e2e tests remain skipped", () => {
  const files = [
    path.join(
      __dirname,
      "..",
      "backend",
      "tests",
      "frontend",
      "modelViewerFallback.e2e.test.ts",
    ),
    path.join(
      __dirname,
      "..",
      "backend",
      "tests",
      "frontend",
      "modelViewerHeadFail.e2e.test.ts",
    ),
  ];
  for (const file of files) {
    test(path.basename(file) + " uses test.skip", () => {
      const src = fs.readFileSync(file, "utf8");
      expect(src.includes("test.skip(")).toBe(true);
    });
  }
});
