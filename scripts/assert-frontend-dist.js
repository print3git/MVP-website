const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "frontend", "dist");
if (!fs.existsSync(distDir)) {
  throw new Error(
    `Missing build output directory: ${distDir}. Run \`npm run build --prefix frontend\` first.`,
  );
}
const indexFile = path.join(distDir, "index.html");
if (!fs.existsSync(indexFile)) {
  throw new Error(
    `Missing index.html in ${distDir}. Ensure the frontend build completed successfully.`,
  );
}
console.log("Found frontend build output:", indexFile);
