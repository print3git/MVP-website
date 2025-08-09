const fs = require("fs");
const path = require("path");

describe("frontend HTML integrity", () => {
  const repoRoot = path.join(__dirname, "..");

  function load(file) {
    return fs.readFileSync(path.join(repoRoot, file), "utf8");
  }

  test("index.html retains critical elements", () => {
    const html = load("index.html");
    expect(html).toMatch(/id="purchase-popups"/);
    expect(html).toMatch(
      /<script type="module" src="js\/index.js" defer><\/script>/,
    );
    expect(html).toMatch(/id="printclub-modal"/);
  });

  test("generate.html retains generator root", () => {
    const html = load("generate.html");
    expect(html).toMatch(/id="gen-app"/);
    expect(html).toMatch(/js\/modelGenerator.js/);
    expect(html).toMatch(/js\/trackingPixel.js/);
  });
});
