const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "frontend", "dist");
if (!fs.existsSync(distDir)) {
  throw new Error(`Missing build output directory: ${distDir}`);
}
const indexFile = path.join(distDir, "index.html");
if (!fs.existsSync(indexFile)) {
  throw new Error(`Missing index.html in ${distDir}`);
}
console.log("Found frontend build output:", indexFile);
