const fs = require("fs");

function validateStl(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length < 84) return false;
    const header = buffer.toString("utf8", 0, 80).trim();
    if (header.startsWith("solid")) {
      return buffer.toString("utf8").includes("endsolid");
    }
    const triCount = buffer.readUInt32LE(80);
    return triCount > 0;
  } catch {
    return false;
  }
}

module.exports = validateStl;
