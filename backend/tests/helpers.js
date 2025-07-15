const fs = require("fs");
const path = require("path");

function loadScript(file) {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8");
  return src.replace(/^import[^;]+;\n?/gm, "");
}

module.exports = { loadScript };
