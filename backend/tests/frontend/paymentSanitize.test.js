/** @jest-environment node */
const fs = require("fs");
const path = require("path");

test("payment script sanitized for node", () => {
  const script = fs
    .readFileSync(path.join(__dirname, "../../../js/payment.js"), "utf8")
    .replace(/import { track } from ['"]\.\/analytics.js['"];?/, "");
  expect(script).not.toMatch(/import /);
});
