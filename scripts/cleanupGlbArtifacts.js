const fs = require("fs");
const path = require("path");
const os = require("os");

function removeGlbFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        removeGlbFiles(p);
      } else if (entry.isFile() && p.endsWith(".glb")) {
        fs.unlinkSync(p);
      }
    } catch (_err) {
      // ignore failures
    }
  }
}

function cleanupGlbArtifacts() {
  const base = path.join(os.tmpdir(), "test");
  removeGlbFiles(base);
  const parent = os.tmpdir();
  for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith("test")) {
      removeGlbFiles(path.join(parent, entry.name));
    }
  }
}

if (require.main === module) {
  cleanupGlbArtifacts();
}

module.exports = cleanupGlbArtifacts;
