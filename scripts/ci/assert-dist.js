const fs = require("fs");
const path = require("path");

const distPath = path.resolve("frontend/dist/index.html");
if (!fs.existsSync(distPath)) {
  console.error(`Missing ${distPath}`);
  process.exit(1);
}
console.log(`Found ${distPath}`);
