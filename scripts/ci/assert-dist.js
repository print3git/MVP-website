const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const distPath = path.resolve("frontend/dist/index.html");
if (!fs.existsSync(distPath)) {
  console.error(`Missing ${distPath}`);
  try {
    const rev = execSync("git rev-parse --short HEAD").toString().trim();
    console.error(rev);
  } catch {
    // ignore errors fetching current revision
  }
  try {
    const ls = execSync("ls -la frontend/dist").toString().trim();
    console.error(ls);
  } catch {
    // ignore errors listing frontend/dist
  }
  process.exit(1);
}
console.log(`Found ${distPath}`);
