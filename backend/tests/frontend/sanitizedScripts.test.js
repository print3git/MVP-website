const fs = require("fs");
const path = require("path");

function sanitize(src) {
  return src.replace(/^import[^\n]*\n/gm, "").replace(/export \{[^}]+\};?/, "");
}

describe("script sanitization", () => {
  test("share.js has imports removed", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../../js/share.js"),
      "utf8",
    );
    const sanitized = sanitize(src);
    expect(sanitized).not.toMatch(/\bimport\b/);
  });

  test("payment.js has imports removed", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../../../js/payment.js"),
      "utf8",
    );
    const sanitized = sanitize(src);
    expect(sanitized).not.toMatch(/\bimport\b/);
  });
});
