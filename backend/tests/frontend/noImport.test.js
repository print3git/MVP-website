const fs = require("fs");
const path = require("path");

describe("sanitized frontend scripts", () => {
  test.each([
    [
      "index.js",
      [
        /import { shareOn } from ['"]\.\/share.js['"];?/,
        /import { track } from ['"]\.\/analytics.js['"];?/,
      ],
    ],
    ["payment.js", [/import { track } from ['"]\.\/analytics.js['"];?/]],
    [
      "share.js",
      [
        /import { track } from ['"]\.\/analytics.js['"];?/,
        /export \{[^}]+\};?/,
      ],
    ],
  ])("removes imports from %s", (file, patterns) => {
    let script = fs.readFileSync(
      path.join(__dirname, `../../../js/${file}`),
      "utf8",
    );
    for (const re of patterns) script = script.replace(re, "");
    expect(script).not.toMatch(/\bimport\b/);
  });
});
