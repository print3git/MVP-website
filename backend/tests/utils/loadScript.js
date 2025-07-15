const fs = require("fs");
const path = require("path");

module.exports = function loadScript(file) {
  return fs
    .readFileSync(path.join(__dirname, "..", "..", "..", file), "utf8")
    .replace(/import[^;]+;\n/g, "")
    .replace(/export\s+\{[^}]+\};?\n?/g, "");
};
