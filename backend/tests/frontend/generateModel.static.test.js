/** @jest-environment node */
const fs = require("fs");
const path = require("path");

test("useGenerateModel posts to generate endpoint", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../../../js/useGenerateModel.js"),
    "utf8",
  );
  expect(src).toMatch(/fetch\("\/api\/generate"/);
});

test("ModelViewer references src prop", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../../../js/ModelViewer.js"),
    "utf8",
  );
  expect(src).toMatch(/Gltf, { src: url/);
});
