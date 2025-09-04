const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const required = [
  path.resolve("index.html"),
  path.resolve("models/boombox.glb"),
];

for (const distPath of required) {
  if (!fs.existsSync(distPath)) {
    console.error(`Missing ${distPath}`);
    try {
      const rev = execSync("git rev-parse --short HEAD").toString().trim();
      console.error(rev);
    } catch {
      // ignore errors fetching current revision
    }
    try {
      const ls = execSync("ls -la").toString().trim();
      console.error(ls);
    } catch {
      // ignore errors listing root
    }
    process.exit(1);
  }
  console.log(`Found ${distPath}`);
}
